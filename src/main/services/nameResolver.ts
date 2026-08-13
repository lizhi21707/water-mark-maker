/**
 * 输出命名模板解析 + 冲突避让（纯函数、零依赖，可用 node --test 直接单测）。
 * Token：{name} 原名（去扩展名）、{ext} 输出扩展名（含点，按格式映射后）、
 *        {n}/{n:3} 序号（补零）、{count} 总数、{date} YYYYMMDD、{time} HHmmss
 */

/** 命名所需的图片最小信息（ImageItem 结构兼容） */
export interface NameInput {
  fileName: string
  ext: string
}

export type ConflictMode = 'rename' | 'skip' | 'overwrite'

type TokenKind = 'name' | 'ext' | 'n' | 'count' | 'date' | 'time'

export interface Token {
  kind: TokenKind
  width?: number
}

/** 输入扩展名 → 输出扩展名（libvips 编码能力映射） */
export function mapOutputExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return 'jpg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'tif':
    case 'tiff':
      return 'tif'
    case 'gif':
      return 'png' // 静态帧 → PNG
    case 'heic':
    case 'heif':
      return 'jpg'
    default:
      return 'jpg'
  }
}

const KNOWN_IMAGE_EXT = /\.(jpe?g|png|webp|bmp|tiff?|gif|heic|heif)$/i
const TOKEN_RE = /\{(\w+)(?::(\d+))?\}/g

export function parseTemplate(template: string): Array<Token | string> {
  const parts: Array<Token | string> = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(template)) !== null) {
    if (m.index > last) parts.push(template.slice(last, m.index))
    const kind = m[1]
    if (kind === 'name' || kind === 'ext' || kind === 'n' || kind === 'count' || kind === 'date' || kind === 'time') {
      parts.push({ kind, width: m[2] ? Number.parseInt(m[2], 10) : undefined })
    } else {
      parts.push(m[0]) // 未知 token 原样保留
    }
    last = m.index + m[0].length
  }
  if (last < template.length) parts.push(template.slice(last))
  return parts
}

function pad(n: number, width?: number): string {
  return width && width > 0 ? String(n).padStart(width, '0') : String(n)
}

function fmtDate(d: Date, pattern: 'YYYYMMDD' | 'HHmmss'): string {
  const p = (n: number): string => pad(n, 2)
  if (pattern === 'HHmmss') return `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

export function renderName(
  parts: Array<Token | string>,
  item: NameInput,
  index: number,
  count: number,
  now: Date
): string {
  let out = ''
  for (const part of parts) {
    if (typeof part === 'string') {
      out += part
      continue
    }
    switch (part.kind) {
      case 'name':
        out += item.fileName.replace(KNOWN_IMAGE_EXT, '')
        break
      case 'ext':
        out += '.' + mapOutputExt(item.ext)
        break
      case 'n':
        out += pad(index + 1, part.width)
        break
      case 'count':
        out += String(count)
        break
      case 'date':
        out += fmtDate(now, 'YYYYMMDD')
        break
      case 'time':
        out += fmtDate(now, 'HHmmss')
        break
    }
  }
  return out
}

export interface ResolvedName {
  name: string
  skipped: boolean
}

/**
 * 解析最终输出名：模板渲染 → 剥掉已知图片扩展名 → 追加映射后的输出扩展名 → 冲突避让。
 * reserved 为小写文件名集合（跨平台不区分大小写）。
 */
export function resolveOutputName(
  item: NameInput,
  index: number,
  count: number,
  template: string,
  reserved: Set<string>,
  conflictMode: ConflictMode,
  now: Date
): ResolvedName {
  const base = renderName(parseTemplate(template), item, index, count, now) || item.fileName
  const outExt = '.' + mapOutputExt(item.ext)
  const stem = base.replace(KNOWN_IMAGE_EXT, '')
  const candidate = stem + outExt

  if (!reserved.has(candidate.toLowerCase())) {
    return { name: candidate, skipped: false }
  }
  if (conflictMode === 'skip') {
    return { name: candidate, skipped: true }
  }
  if (conflictMode === 'overwrite') {
    return { name: candidate, skipped: false }
  }
  // rename：扩展名前插入 _1、_2 …
  let i = 1
  let renamed = `${stem}_${i}${outExt}`
  while (reserved.has(renamed.toLowerCase())) {
    i++
    renamed = `${stem}_${i}${outExt}`
  }
  return { name: renamed, skipped: false }
}

/** 扫描输出目录已有文件名（小写集合），用于冲突判定 */
export function scanReserved(outDir: string, readDir: (dir: string) => string[]): Set<string> {
  try {
    return new Set(readDir(outDir).map((f) => f.toLowerCase()))
  } catch {
    return new Set()
  }
}
