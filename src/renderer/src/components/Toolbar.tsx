import { useAppStore } from '../store/useAppStore'
import { IconExport, IconImage, IconPlus, IconTrash, IconSparkle } from './Icons'

export function Toolbar({ onExport }: { onExport: () => void }): React.JSX.Element {
  const images = useAppStore((s) => s.images)
  const addPaths = useAppStore((s) => s.addPaths)
  const clearImages = useAppStore((s) => s.clearImages)
  const exportRunning = useAppStore((s) => s.exportUi.phase === 'running')

  const pick = async (): Promise<void> => {
    const paths = await window.api.pickImages()
    if (paths.length > 0) void addPaths(paths)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-card px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
          <IconSparkle size={17} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-wide">水印工具</div>
          <div className="text-[10px] text-ink-faint">批量图片水印 · 离线可用</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {images.length > 0 && (
          <>
            <span className="mr-1 text-xs text-ink-soft">
              共 <span className="font-semibold text-ink">{images.length}</span> 张
            </span>
            <button
              onClick={() => void clearImages()}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] text-ink-soft transition-colors hover:bg-bg hover:text-ink"
            >
              <IconTrash size={14} />
              清空
            </button>
          </>
        )}
        <button
          onClick={() => void pick()}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-soft px-4 text-[13px] font-medium text-primary transition-colors hover:bg-indigo-100 active:scale-[0.98]"
        >
          <IconPlus size={15} />
          添加图片
        </button>
        <button
          onClick={onExport}
          disabled={images.length === 0 || exportRunning}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconExport size={15} />
          导出
        </button>
      </div>
    </header>
  )
}

export function EmptyState(): React.JSX.Element {
  const addPaths = useAppStore((s) => s.addPaths)

  const pick = async (): Promise<void> => {
    const paths = await window.api.pickImages()
    if (paths.length > 0) void addPaths(paths)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <IconImage size={40} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-base font-medium text-ink">开始添加照片</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          将图片拖拽到窗口中，或点击下方按钮选择
        </p>
      </div>
      <button
        onClick={() => void pick()}
        className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.98]"
      >
        <IconPlus size={15} />
        选择图片
      </button>
      <p className="text-[11px] text-ink-faint">支持 JPG / PNG / WebP / TIFF / GIF / HEIC</p>
    </div>
  )
}
