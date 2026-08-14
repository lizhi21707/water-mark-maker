import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { formatDate, resolveWatermarkText } from '../src/shared/date.ts'
import { exifCreateTime, createdTimeMs } from '../src/main/utils/exif.ts'
import type { WatermarkConfig } from '../src/shared/types.ts'

const SAMPLE = new Date(2026, 7, 14, 9, 5, 7).getTime() // 2026-08-14 09:05:07

function makeConfig(patch: Partial<WatermarkConfig>): WatermarkConfig {
  return {
    text: '© 我的照片',
    usePhotoDate: false,
    dateFormat: 'YYYY-MM-DD',
    position: 'bottom-right',
    sizePct: 20,
    marginPct: 3,
    color: '#ffffff',
    opacity: 60,
    fontWeight: 400,
    rotation: 'auto',
    ...patch
  }
}

describe('formatDate', () => {
  it('补零/不补零 token', () => {
    assert.equal(formatDate(SAMPLE, 'YYYY-MM-DD HH:mm'), '2026-08-14 09:05')
    assert.equal(formatDate(SAMPLE, 'YY-M-D H:m'), '26-8-14 9:5')
  })
  it('中文格式', () => {
    assert.equal(formatDate(SAMPLE, 'YYYY年M月D日'), '2026年8月14日')
    assert.equal(formatDate(SAMPLE, 'YYYY年MM月DD日'), '2026年08月14日')
  })
  it('未知 token 原样保留', () => {
    assert.equal(formatDate(SAMPLE, 'YYYY/MM/DD'), '2026/08/14')
  })
  it('非法时间戳返回空串', () => {
    assert.equal(formatDate(Number.NaN, 'YYYY'), '')
  })
})

describe('resolveWatermarkText', () => {
  it('未勾选时用用户文本', () => {
    const c = makeConfig({})
    assert.equal(resolveWatermarkText(c, SAMPLE), '© 我的照片')
  })
  it('勾选 + 有日期 → 日期文本', () => {
    const c = makeConfig({ usePhotoDate: true, dateFormat: 'YYYY年M月D日' })
    assert.equal(resolveWatermarkText(c, SAMPLE), '2026年8月14日')
  })
  it('勾选 + 无日期 → 回退用户文本', () => {
    const c = makeConfig({ usePhotoDate: true })
    assert.equal(resolveWatermarkText(c, null), '© 我的照片')
  })
  it('勾选 + 空格式 → 回退用户文本', () => {
    const c = makeConfig({ usePhotoDate: true, dateFormat: '' })
    assert.equal(resolveWatermarkText(c, SAMPLE), '© 我的照片')
  })
})

/** 手工拼一个最小 EXIF（TIFF little-endian），含 DateTimeOriginal 与 IFD0 DateTime */
function makeExif(
  dateStr = '2024:03:05 12:34:56',
  withExifPrefix = false
): Buffer {
  const buf = Buffer.alloc(withExifPrefix ? 6 + 74 : 74)
  let o = withExifPrefix ? 6 : 0 // TIFF 数据起始绝对偏移；偏移字段相对它
  if (withExifPrefix) buf.write('Exif\0\0', 0, 'ascii')
  // TIFF 头：II*\0 + IFD0 相对偏移 8
  buf[o] = 0x49
  buf[o + 1] = 0x49
  buf.writeUInt16LE(42, o + 2)
  buf.writeUInt32LE(8, o + 4)
  // IFD0：2 个 entry
  buf.writeUInt16LE(2, o + 8)
  // entry1: tag 0x8769 ExifIFD, LONG, 值 = 相对 56
  buf.writeUInt16LE(0x8769, o + 10)
  buf.writeUInt16LE(4, o + 12)
  buf.writeUInt32LE(1, o + 14)
  buf.writeUInt32LE(56, o + 18)
  // entry2: tag 0x0132 DateTime, ASCII 20 字节, 值 = 相对 36
  buf.writeUInt16LE(0x0132, o + 22)
  buf.writeUInt16LE(2, o + 24)
  buf.writeUInt32LE(20, o + 26)
  buf.writeUInt32LE(36, o + 30)
  buf.writeUInt32LE(0, o + 34) // IFD0 下一个 IFD
  buf.write(dateStr + '\0', o + 36, 'ascii') // 相对 36
  // Exif IFD：1 个 entry（DateTimeOriginal 0x9003）
  buf.writeUInt16LE(1, o + 56)
  buf.writeUInt16LE(0x9003, o + 58)
  buf.writeUInt16LE(2, o + 60)
  buf.writeUInt32LE(20, o + 62)
  buf.writeUInt32LE(36, o + 66) // 复用相对 36 的日期字符串
  buf.writeUInt32LE(0, o + 70)
  return buf
}

describe('exifCreateTime', () => {
  it('提取 DateTimeOriginal（本地时区）', () => {
    const expect = new Date(2024, 2, 5, 12, 34, 56).getTime()
    assert.equal(exifCreateTime(makeExif()), expect)
  })
  it('JPEG 带 Exif\\0\\0 前缀', () => {
    const expect = new Date(2024, 2, 5, 12, 34, 56).getTime()
    assert.equal(exifCreateTime(makeExif('2024:03:05 12:34:56', true)), expect)
  })
  it('空/垃圾 buffer 返回 null', () => {
    assert.equal(exifCreateTime(undefined), null)
    assert.equal(exifCreateTime(Buffer.alloc(8)), null)
    assert.equal(exifCreateTime(Buffer.from('garbage-garbage', 'ascii')), null)
  })
  it('日期字段越界返回 null（回退 mtime）', () => {
    assert.equal(exifCreateTime(makeExif('2024:13:45 99:00:00')), null)
  })
})

describe('createdTimeMs', () => {
  it('无 EXIF 时回退文件 mtime', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wm-test-'))
    const f = join(dir, 'a.png')
    writeFileSync(f, 'x')
    const t = new Date(2023, 0, 15, 8, 30, 0)
    utimesSync(f, t, t)
    try {
      const got = await createdTimeMs(f, undefined)
      assert.ok(Math.abs(got! - t.getTime()) < 1000, `mtime 应为 2023-01-15，实际 ${got}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('EXIF 优先于 mtime', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wm-test-'))
    const f = join(dir, 'a.jpg')
    writeFileSync(f, 'x')
    try {
      const got = await createdTimeMs(f, makeExif())
      assert.equal(got, new Date(2024, 2, 5, 12, 34, 56).getTime())
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('sharp 真实文件集成', () => {
  it('带 EXIF DateTime 的 jpeg → 提取 EXIF 时间', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wm-test-'))
    const f = join(dir, 'exif.jpg')
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#cc0000' }
    })
      .withExif({ IFD0: { DateTime: '2024:03:05 12:34:56' } })
      .jpeg()
      .toFile(f)
    try {
      const meta = await sharp(f).metadata()
      const got = await createdTimeMs(f, meta.exif)
      assert.equal(got, new Date(2024, 2, 5, 12, 34, 56).getTime())
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('无 EXIF 的 png → 回退 mtime', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wm-test-'))
    const f = join(dir, 'plain.png')
    await sharp({ create: { width: 64, height: 64, channels: 3, background: '#00cc00' } })
      .png()
      .toFile(f)
    try {
      const t = new Date(2022, 5, 1, 10, 0, 0)
      utimesSync(f, t, t)
      const got = await createdTimeMs(f, undefined)
      assert.ok(Math.abs(got! - t.getTime()) < 1000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
