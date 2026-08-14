import type { WatermarkConfig } from './types.ts'

/**
 * 日期格式化纯函数（零依赖，main 导出与 renderer 预览共用）。
 * token：YYYY/YY 年、MM/M 月（补零/不补零）、DD/D 日、HH/H 时（24h）、mm/m 分。
 */

/** 下拉里示例日期（2026-08-14 09:05），用于展示格式效果 */
export const DATE_FORMAT_SAMPLE = new Date(2026, 7, 14, 9, 5).getTime()

export const DATE_FORMAT_PRESETS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY.MM.DD',
  'YYYY年M月D日',
  'YYYY年MM月DD日',
  'MM/DD/YYYY',
  'YYYY-MM-DD HH:mm'
] as const

/** 长 token 在前，避免 'MM' 被 'M' 先替换 */
const TOKENS: Array<[string, (d: Date) => string]> = [
  ['YYYY', (d) => String(d.getFullYear())],
  ['YY', (d) => String(d.getFullYear()).slice(-2)],
  ['MM', (d) => String(d.getMonth() + 1).padStart(2, '0')],
  ['M', (d) => String(d.getMonth() + 1)],
  ['DD', (d) => String(d.getDate()).padStart(2, '0')],
  ['D', (d) => String(d.getDate())],
  ['HH', (d) => String(d.getHours()).padStart(2, '0')],
  ['H', (d) => String(d.getHours())],
  ['mm', (d) => String(d.getMinutes()).padStart(2, '0')],
  ['m', (d) => String(d.getMinutes())]
]

/** 未知 token 原样保留 */
export function formatDate(ms: number, format: string): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  let out = format
  for (const [token, fn] of TOKENS) {
    out = out.split(token).join(fn(d))
  }
  return out
}

/**
 * 解析最终水印文本：勾选「使用照片创建日期」时取日期文本；
 * 无日期（createdAt 为 null）或格式非法时回退用户输入文本。
 */
export function resolveWatermarkText(config: WatermarkConfig, createdAt: number | null): string {
  if (!config.usePhotoDate) return config.text
  if (createdAt == null) return config.text
  const dateText = formatDate(createdAt, config.dateFormat)
  return dateText === '' ? config.text : dateText
}
