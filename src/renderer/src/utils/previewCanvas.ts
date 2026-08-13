import { WATERMARK_FONT_FAMILY } from '@shared/ipc'
import { computeLayout } from '@shared/layout'
import type { WatermarkConfig } from '@shared/types'

/**
 * 渲染层水印绘制：与 main 进程 resvg/SVG 共用 computeLayout 几何公式，
 * 保证预览与导出位置/大小/旋转一致（渲染引擎字体度量有微小差异，百分比定位下可忽略）。
 */

export function ensureFont(weight: 400 | 700): Promise<void> {
  return document.fonts
    .load(`${weight} 16px "${WATERMARK_FONT_FAMILY}"`)
    .then(() => undefined)
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  config: WatermarkConfig,
  boxW: number,
  boxH: number
): void {
  if (!config.text.trim()) return
  const layout = computeLayout(config, boxW, boxH)
  if (!layout) return

  const { vertical, fontSize, lineHeight, cx, cy, lines } = layout
  const color = /^#[0-9a-fA-F]{6}$/.test(config.color) ? config.color : '#ffffff'

  ctx.save()
  ctx.globalAlpha = Math.min(100, Math.max(0, config.opacity)) / 100
  ctx.fillStyle = color
  ctx.font = `${config.fontWeight} ${fontSize}px "${WATERMARK_FONT_FAMILY}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.translate(cx, cy)
  if (vertical) ctx.rotate(Math.PI / 2) // 与 SVG rotate(90) 同方向：从上到下阅读
  lines.forEach((line, i) => {
    const y = (i - (lines.length - 1) / 2) * lineHeight + fontSize * 0.35
    ctx.fillText(line, 0, y)
  })
  ctx.restore()
}

/** 缩略图 + 水印一次性合成（网格卡片用），返回 dataURL */
export function compositeThumb(
  source: HTMLImageElement,
  config: WatermarkConfig
): string {
  const canvas = document.createElement('canvas')
  canvas.width = source.naturalWidth
  canvas.height = source.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(source, 0, 0)
  drawWatermark(ctx, config, source.naturalWidth, source.naturalHeight)
  return canvas.toDataURL('image/jpeg', 0.85)
}
