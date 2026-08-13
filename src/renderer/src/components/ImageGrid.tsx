import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../store/useAppStore'
import { ImageCard } from './ImageCard'

const GAP = 12
const MIN_CARD_W = 168
/** 卡片信息区高度（文件名 + 尺寸两行） */
const CARD_INFO_H = 48

/**
 * 虚拟化图片网格：行虚拟化 + 动态列数。
 * 只渲染视口内卡片（overscan 3 行），1000+ 张滚动流畅；
 * 水印配置用 useDeferredValue 延迟，拖动滑杆时让位于 UI 响应。
 */
export function ImageGrid(): React.JSX.Element {
  const images = useAppStore((s) => s.images)
  const watermark = useAppStore((s) => s.watermark)
  const deferredWatermark = useDeferredValue(watermark)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols = Math.max(1, Math.floor((containerW + GAP) / (MIN_CARD_W + GAP)))
  const cardW = containerW > 0 ? (containerW - GAP * (cols - 1)) / cols : MIN_CARD_W
  const cardH = cardW * 0.75 + CARD_INFO_H
  const rowCount = Math.ceil(images.length / cols)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => cardH + GAP,
    overscan: 3
  })

  return (
    <div ref={containerRef} data-grid-scroll className="h-full overflow-y-auto">
      <div className="relative" style={{ height: virtualizer.getTotalSize(), margin: 16 }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            className="grid"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: row.size - GAP,
              transform: `translateY(${row.start}px)`,
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: GAP
            }}
          >
            {Array.from({ length: cols }, (_, c) => {
              const item = images[row.index * cols + c]
              return item ? (
                <ImageCard key={item.id} item={item} watermark={deferredWatermark} />
              ) : (
                <div key={`empty-${c}`} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
