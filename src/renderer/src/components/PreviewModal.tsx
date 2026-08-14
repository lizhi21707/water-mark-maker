import { useEffect, useRef } from 'react'
import { resolveWatermarkText } from '@shared/date'
import { useAppStore } from '../store/useAppStore'
import { IconChevronLeft, IconChevronRight, IconX } from './Icons'
import { drawWatermark, ensureFont } from '../utils/previewCanvas'

/**
 * 大图预览：wm-img 协议直读原图（Chromium 解码，零 JS 拷贝），
 * 水印 overlay 用覆盖 canvas 按显示尺寸实时绘制，参数调整零 IPC 即时反馈。
 * 左右箭头按钮 / 键盘 ←→ 循环切换图片，Esc 关闭。
 */
export function PreviewModal(): React.JSX.Element | null {
  const previewId = useAppStore((s) => s.previewId)
  const setPreviewId = useAppStore((s) => s.setPreviewId)
  const images = useAppStore((s) => s.images)
  const item = images.find((i) => i.id === previewId)
  const watermark = useAppStore((s) => s.watermark)

  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const index = item ? images.indexOf(item) : -1
  const total = images.length

  const switchTo = (dir: 1 | -1): void => {
    if (total < 2 || index < 0) return
    const next = images[(index + dir + total) % total]
    setPreviewId(next.id)
  }

  // 键盘 ←→ 切换
  useEffect(() => {
    if (!previewId) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') switchTo(-1)
      else if (e.key === 'ArrowRight') switchTo(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewId, index, total])

  // 水印 overlay：与图片显示框等大，配置变化即时重绘
  useEffect(() => {
    if (!previewId) return
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const draw = (): void => {
      const w = img.clientWidth
      const h = img.clientHeight
      if (w === 0 || h === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      const eff = { ...watermark, text: resolveWatermarkText(watermark, item?.createdAt ?? null) }
      ensureFont(watermark.fontWeight).then(() => drawWatermark(ctx, eff, w, h))
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(img)
    // 切换图片后等新图加载完成再重绘 overlay
    img.addEventListener('load', draw)
    return () => {
      ro.disconnect()
      img.removeEventListener('load', draw)
    }
  }, [previewId, watermark])

  if (!previewId || !item) return null

  const navBtn =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 active:scale-95'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-8 backdrop-blur-[2px]"
      onClick={() => setPreviewId(null)}
    >
      <div className="flex max-h-full max-w-full items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {total > 1 && (
          <button className={navBtn} onClick={() => switchTo(-1)} title="上一张 (←)" aria-label="上一张">
            <IconChevronLeft size={22} />
          </button>
        )}
        <div className="relative max-h-full max-w-full">
          <div className="relative inline-block max-h-[82vh] max-w-[80vw]">
            <img
              ref={imgRef}
              src={window.api.imageUrl(previewId)}
              alt={item.fileName}
              className="block max-h-[82vh] max-w-[80vw] rounded-xl object-contain shadow-2xl"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 rounded-xl"
            />
          </div>
          <div className="mt-2 text-center text-[12px] text-white/70">
            {item.fileName} · {item.width} × {item.height}
            {total > 1 && ` · ${index + 1} / ${total}`}
          </div>
          <button
            onClick={() => setPreviewId(null)}
            className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-lg transition-transform hover:scale-110"
            title="关闭 (Esc)"
          >
            <IconX size={15} />
          </button>
        </div>
        {total > 1 && (
          <button className={navBtn} onClick={() => switchTo(1)} title="下一张 (→)" aria-label="下一张">
            <IconChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  )
}
