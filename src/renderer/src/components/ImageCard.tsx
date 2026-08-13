import type { ImageItem, WatermarkConfig } from '@shared/types'
import { useWatermarkedThumb } from '../hooks/useWatermarkedThumb'
import { useAppStore } from '../store/useAppStore'
import { IconAlert, IconCheck } from './Icons'

function StatusBadge({ item }: { item: ImageItem }): React.JSX.Element | null {
  if (item.status === 'pending') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-card/60">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (item.status === 'thumb-error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-danger-soft/90">
        <IconAlert size={20} className="text-danger" />
        <span className="text-[11px] text-danger">{item.error ?? '无法读取'}</span>
      </div>
    )
  }
  if (item.status === 'exported' || item.status === 'skipped') {
    return (
      <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white shadow-sm">
        <IconCheck size={12} strokeWidth={3} />
      </div>
    )
  }
  if (item.status === 'failed') {
    return (
      <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-sm">
        <IconAlert size={12} strokeWidth={3} />
      </div>
    )
  }
  return null
}

export function ImageCard({
  item,
  watermark
}: {
  item: ImageItem
  watermark: WatermarkConfig
}): React.JSX.Element {
  const setPreviewId = useAppStore((s) => s.setPreviewId)
  const src = useWatermarkedThumb(item, watermark)

  return (
    <div
      className="group h-full cursor-pointer overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md"
      onClick={() => item.status === 'ready' && setPreviewId(item.id)}
      title={item.fileName}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100">
        {item.thumb && (
          <img
            src={src ?? item.thumb.dataUrl}
            alt={item.fileName}
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            draggable={false}
          />
        )}
        <StatusBadge item={item} />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[12px] font-medium text-ink">{item.fileName}</p>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {item.width > 0 ? `${item.width} × ${item.height}` : item.ext.toUpperCase()}
        </p>
      </div>
    </div>
  )
}
