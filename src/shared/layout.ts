import { WATERMARK_FONT_FAMILY } from './ipc.ts'
import type { WatermarkConfig, WatermarkPosition } from './types.ts'

/**
 * 水印几何计算（纯函数，零依赖）。
 * main 进程（导出 SVG）与 renderer（canvas 预览）共用，保证预览与导出几何一致。
 */

export interface LayoutResult {
  /** 是否旋转 90°（从上到下阅读） */
  vertical: boolean
  fontSize: number
  lineHeight: number
  /** 水印块在图像上的尺寸 */
  blockW: number
  blockH: number
  /** 水印块中心在图像上的坐标 */
  cx: number
  cy: number
  lines: string[]
}

const LINE_HEIGHT_RATIO = 1.4
/** CJK 全角字符宽度近似 1em，拉丁等半角字符约 0.55em */
const CJK_RE = /[⺀-鿿豈-﫿＀-￯　-〿]/

function lineWidthEm(line: string): number {
  let w = 0
  for (const ch of line) w += CJK_RE.test(ch) ? 1 : 0.55
  return Math.max(w, 0.5)
}

/** SVG/XML 文本转义，防注入 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function axisFactor(position: WatermarkPosition): { h: 0 | 0.5 | 1; v: 0 | 0.5 | 1 } {
  const h = position.includes('left') ? 0 : position.includes('right') ? 1 : 0.5
  const v = position.startsWith('top') ? 0 : position.startsWith('bottom') ? 1 : 0.5
  return { h, v }
}

/**
 * 计算水印布局。文本为空时返回 null。
 * 原理：文字方向跨度 T = 短边 × sizePct%，字号 = T / 最宽行宽度(em)；
 * 横图块为 T×th 水平排版；竖图块旋转 90° 后为 th×T，自上而下阅读。
 */
export function computeLayout(
  config: WatermarkConfig,
  imgW: number,
  imgH: number
): LayoutResult | null {
  const lines = config.text.split('\n')
  if (lines.length === 0 || config.text.trim() === '') return null

  const S = Math.min(imgW, imgH)
  if (S <= 0) return null
  const T = (S * config.sizePct) / 100
  const M = (S * config.marginPct) / 100

  const vertical =
    config.rotation === 'vertical' || (config.rotation === 'auto' && imgH > imgW)

  const maxWidthEm = Math.max(...lines.map(lineWidthEm))
  let fontSize = T / maxWidthEm
  let lineHeight = fontSize * LINE_HEIGHT_RATIO
  let textH = lines.length * lineHeight
  // 多行过高时整体收缩，避免超出 T 的 1.2 倍
  const k = Math.min(1, (T * 1.2) / textH)
  fontSize *= k
  lineHeight *= k
  textH *= k

  const blockW = vertical ? textH : T
  const blockH = vertical ? T : textH

  const { h, v } = axisFactor(config.position)
  const cx = h === 0.5 ? imgW / 2 : h === 0 ? blockW / 2 + M : imgW - blockW / 2 - M
  const cy = v === 0.5 ? imgH / 2 : v === 0 ? blockH / 2 + M : imgH - blockH / 2 - M

  return { vertical, fontSize, lineHeight, blockW, blockH, cx, cy, lines }
}

/**
 * 构建水印 SVG。文本先按水平方向排版（排版盒 tw×th），
 * 垂直模式再整体 rotate(90)：映射 (x,y)→(th-y,x)，文字从上到下阅读、多行成右→左竖列。
 */
export function buildSvg(config: WatermarkConfig, layout: LayoutResult): string {
  const { vertical, fontSize, lineHeight, blockW, blockH, lines } = layout
  const n = lines.length
  const color = /^#[0-9a-fA-F]{6}$/.test(config.color) ? config.color : '#ffffff'
  const opacity = Math.min(100, Math.max(0, config.opacity)) / 100

  // 水平排版盒尺寸：横图为 blockW×blockH；竖图先按 blockH(跨度)×blockW(行高) 排版再旋转
  const tw = vertical ? blockH : blockW
  const th = vertical ? blockW : blockH

  const texts = lines
    .map((line, i) => {
      const y = th / 2 + (i - (n - 1) / 2) * lineHeight + fontSize * 0.35
      return `<text x="${tw / 2}" y="${y.toFixed(2)}" text-anchor="middle">${escapeXml(line)}</text>`
    })
    .join('')
  const inner = `<g fill="${color}" fill-opacity="${opacity}" font-family="${WATERMARK_FONT_FAMILY}" font-weight="${config.fontWeight}" font-size="${fontSize.toFixed(2)}">${texts}</g>`

  if (!vertical) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${blockW.toFixed(2)}" height="${blockH.toFixed(2)}" viewBox="0 0 ${blockW.toFixed(2)} ${blockH.toFixed(2)}">${inner}</svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${blockW.toFixed(2)}" height="${blockH.toFixed(2)}" viewBox="0 0 ${blockW.toFixed(2)} ${blockH.toFixed(2)}"><g transform="translate(${(blockW / 2).toFixed(2)}, ${(blockH / 2).toFixed(2)}) rotate(90) translate(${(-tw / 2).toFixed(2)}, ${(-th / 2).toFixed(2)})">${inner}</g></svg>`
}
