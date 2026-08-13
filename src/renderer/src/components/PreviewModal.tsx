import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { IconX } from './Icons'
import { drawWatermark, ensureFont } from '../utils/previewCanvas'

/**
 * 大图预览：wm-img 协议直读原图（Chromium 解码，零 JS 拷贝），
 * 水印 overlay 用覆盖 canvas 按显示尺寸实时绘制，参数调整零 IPC 即时反馈。
 */
export function PreviewModal(): React.JSX.Element | null {
  const previewId = useAppStore((s) => s.previewId)
  const setPreviewId = useAppStore((s) => s.setPreviewId)
  const item = useAppStore((s) => s.images.find((i) => i.id === s.previewId))
  const watermark = useAppStore((s) => s.watermark)

  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      ensureFont(watermark.fontWeight).then(() => drawWatermark(ctx, watermark, w, h))
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(img)
    return () => ro.disconnect()
  }, [previewId, watermark])

  if (!previewId || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-8 backdrop-blur-[2px]"
      onClick={() => setPreviewId(null)}
    >
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-block max-h-[82vh] max-w-[82vw]">
          <img
            ref={imgRef}
            src={window.api.imageUrl(previewId)}
            alt={item.fileName}
            className="block max-h-[82vh] max-w-[82vw] rounded-xl object-contain shadow-2xl"
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute left-0 top-0 rounded-xl"
          />
        </div>
        <div className="mt-2 text-center text-[12px] text-white/70">
          {item.fileName} · {item.width} × {item.height}
        </div>
        <button
          onClick={() => setPreviewId(null)}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-lg transition-transform hover:scale-110"
          title="关闭 (Esc)"
        >
          <IconX size={15} />
        </button>
      </div>
    </div>
  )
}
