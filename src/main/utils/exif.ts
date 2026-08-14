import { stat } from 'fs/promises'

/**
 * 从 sharp metadata().exif 原始 buffer 中提取照片创建时间（ms）。
 * 优先级：Exif IFD DateTimeOriginal(0x9003) > DateTimeDigitized(0x9004) > IFD0 DateTime(0x0132)。
 * EXIF 时间字符串 "YYYY:MM:DD HH:MM:SS" 无时区（相机本地时间），按本地时区解析。
 * 纯手写 TIFF/EXIF 遍历，全程越界检查，解析失败返回 null（调用方兜底文件 mtime）。
 */

const TIFF_MAGIC = 'Exif\0\0'

/** ASCII 字符串可能带 NUL 结尾，截到首个 \0 */
function asciiValue(buf: Buffer, off: number, len: number): string {
  const end = Math.min(off + len, buf.length)
  const nul = buf.indexOf(0, off)
  const cut = nul >= off && nul < end ? nul : end
  return buf.toString('ascii', off, cut)
}

/** "YYYY:MM:DD HH:MM:SS" → ms；字段越界或格式不符返回 null */
function parseExifTime(s: string): number | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number)
  if (y < 1970 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 60) return null
  const t = new Date(y, mo - 1, d, h, mi, se).getTime()
  return Number.isNaN(t) ? null : t
}

export function exifCreateTime(exif: Buffer | undefined): number | null {
  if (!exif || exif.length < 8) return null
  // 部分容器（JPEG APP1）带 "Exif\0\0" 前缀，PNG eXIf 等直接是 TIFF
  let off = 0
  if (exif.subarray(0, 6).toString('latin1') === TIFF_MAGIC) off = 6

  const le = exif[off] === 0x49 && exif[off + 1] === 0x49
  const be = exif[off] === 0x4d && exif[off + 1] === 0x4d
  if (!le && !be) return null
  const magic = le ? exif.readUInt16LE(off + 2) : exif.readUInt16BE(off + 2)
  if (magic !== 42) return null

  const u16 = (o: number): number => (le ? exif.readUInt16LE(o) : exif.readUInt16BE(o))
  const u32 = (o: number): number => (le ? exif.readUInt32LE(o) : exif.readUInt32BE(o))

  /** 遍历一个 IFD，收集目标 tag 的字符串值；返回 Exif IFD 偏移 */
  const walk = (ifdOff: number, want: Record<number, boolean>): { found: string | null; exifOff: number | null } => {
    if (ifdOff + 2 > exif.length) return { found: null, exifOff: null }
    const count = u16(ifdOff)
    let found: string | null = null
    let exifOff: number | null = null
    for (let i = 0; i < count; i++) {
      const e = ifdOff + 2 + i * 12
      if (e + 12 > exif.length) break
      const tag = u16(e)
      const type = u16(e + 2)
      const size = u32(e + 4)
      // ASCII 值 >4 字节存偏移（相对 TIFF 起始），否则内联
      let valOff = e + 8
      if (type === 2 && size > 4) {
        const rel = u32(e + 8)
        if (off + rel >= exif.length) continue
        valOff = off + rel
      }
      if (tag === 0x8769) {
        const rel = u32(e + 8)
        if (off + rel < exif.length) exifOff = off + rel
        continue
      }
      if (want[tag] && type === 2) {
        const s = asciiValue(exif, valOff, size)
        if (found === null) found = s
      }
    }
    return { found, exifOff }
  }

  const ifd0 = walk(off + u32(off + 4), { 0x0132: true })
  if (ifd0.exifOff != null) {
    const sub = walk(ifd0.exifOff, { 0x9003: true, 0x9004: true })
    // DateTimeOriginal 优先，其次 DateTimeDigitized，最后 IFD0 DateTime
    return parseExifTime(sub.found ?? ifd0.found ?? '')
  }
  return parseExifTime(ifd0.found ?? '')
}

/** 图片创建时间：EXIF → 文件 mtime 兜底 */
export async function createdTimeMs(path: string, exif: Buffer | undefined): Promise<number | null> {
  const t = exifCreateTime(exif)
  if (t != null) return t
  try {
    const st = await stat(path)
    return st.mtimeMs
  } catch {
    return null
  }
}
