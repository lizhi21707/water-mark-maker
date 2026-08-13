import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mapOutputExt,
  parseTemplate,
  renderName,
  resolveOutputName
} from '../src/main/services/nameResolver.ts'
import type { ImageItem } from '../src/shared/types'

function makeItem(fileName: string): ImageItem {
  const dot = fileName.lastIndexOf('.')
  return {
    id: 'f_test',
    filePath: `/tmp/${fileName}`,
    fileName,
    ext: dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '',
    width: 100,
    height: 100,
    thumb: null,
    status: 'ready'
  }
}

const NOW = new Date(2026, 7, 13, 15, 30, 42) // 2026-08-13 15:30:42

describe('mapOutputExt', () => {
  it('jpg/jpeg → jpg', () => {
    assert.equal(mapOutputExt('jpg'), 'jpg')
    assert.equal(mapOutputExt('JPEG'), 'jpg')
  })
  it('gif → png（静态帧）', () => {
    assert.equal(mapOutputExt('gif'), 'png')
  })
  it('heic/heif → jpg', () => {
    assert.equal(mapOutputExt('heic'), 'jpg')
    assert.equal(mapOutputExt('heif'), 'jpg')
  })
  it('png/webp/tiff 保持', () => {
    assert.equal(mapOutputExt('png'), 'png')
    assert.equal(mapOutputExt('webp'), 'webp')
    assert.equal(mapOutputExt('tif'), 'tif')
    assert.equal(mapOutputExt('tiff'), 'tif')
  })
})

describe('parseTemplate + renderName', () => {
  it('默认模板 {name}_wm{ext}', () => {
    const parts = parseTemplate('{name}_wm{ext}')
    const out = renderName(parts, makeItem('photo.JPG'), 0, 3, NOW)
    assert.equal(out, 'photo_wm.jpg')
  })
  it('序号补零 {n:3}', () => {
    const parts = parseTemplate('{date}_{n:3}')
    const out = renderName(parts, makeItem('a.png'), 6, 100, NOW)
    assert.equal(out, '20260813_007')
  })
  it('时间与总数', () => {
    const parts = parseTemplate('{time}_{count}')
    const out = renderName(parts, makeItem('a.png'), 0, 42, NOW)
    assert.equal(out, '153042_42')
  })
  it('未知 token 原样保留', () => {
    const parts = parseTemplate('{foo}_x')
    const out = renderName(parts, makeItem('a.png'), 0, 1, NOW)
    assert.equal(out, '{foo}_x')
  })
})

describe('resolveOutputName 冲突避让', () => {
  const item = makeItem('photo.jpg')

  it('无冲突直接使用', () => {
    const r = resolveOutputName(item, 0, 2, '{name}_wm{ext}', new Set(), 'rename', NOW)
    assert.deepEqual(r, { name: 'photo_wm.jpg', skipped: false })
  })

  it('rename：冲突追加 _1、_2', () => {
    const reserved = new Set(['photo_wm.jpg'])
    const r1 = resolveOutputName(item, 0, 2, '{name}_wm{ext}', reserved, 'rename', NOW)
    assert.deepEqual(r1, { name: 'photo_wm_1.jpg', skipped: false })
    reserved.add(r1.name.toLowerCase())
    const r2 = resolveOutputName(item, 0, 2, '{name}_wm{ext}', reserved, 'rename', NOW)
    assert.deepEqual(r2, { name: 'photo_wm_2.jpg', skipped: false })
  })

  it('skip：冲突跳过', () => {
    const r = resolveOutputName(item, 0, 2, '{name}_wm{ext}', new Set(['photo_wm.jpg']), 'skip', NOW)
    assert.deepEqual(r, { name: 'photo_wm.jpg', skipped: true })
  })

  it('overwrite：冲突覆盖', () => {
    const r = resolveOutputName(item, 0, 2, '{name}_wm{ext}', new Set(['photo_wm.jpg']), 'overwrite', NOW)
    assert.deepEqual(r, { name: 'photo_wm.jpg', skipped: false })
  })

  it('模板无扩展名时追加映射后扩展名（gif→png）', () => {
    const r = resolveOutputName(makeItem('pic.gif'), 0, 2, '{name}_copy', new Set(), 'rename', NOW)
    assert.deepEqual(r, { name: 'pic_copy.png', skipped: false })
  })

  it('{ext} 使用映射后扩展名（heic→jpg）', () => {
    const r = resolveOutputName(makeItem('x.heic'), 0, 2, '{name}{ext}', new Set(), 'rename', NOW)
    assert.deepEqual(r, { name: 'x.jpg', skipped: false })
  })

  it('大小写不敏感冲突（reserved 由 scanReserved 统一小写）', () => {
    const r = resolveOutputName(item, 0, 2, '{name}_wm{ext}', new Set(['PHOTO_WM.JPG'.toLowerCase()]), 'rename', NOW)
    assert.deepEqual(r, { name: 'photo_wm_1.jpg', skipped: false })
  })
})
