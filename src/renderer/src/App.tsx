import { useEffect, useState } from 'react'
import { ExportDialog } from './components/ExportDialog'
import { ImageGrid } from './components/ImageGrid'
import { PreviewModal } from './components/PreviewModal'
import { ProgressBar } from './components/ProgressBar'
import { Toasts } from './components/Toasts'
import { EmptyState, Toolbar } from './components/Toolbar'
import { WatermarkPanel } from './components/WatermarkPanel'
import { useAppStore } from './store/useAppStore'

export default function App(): React.JSX.Element {
  const ready = useAppStore((s) => s.ready)
  const [exportOpen, setExportOpen] = useState(false)
  const init = useAppStore((s) => s.init)
  const images = useAppStore((s) => s.images)
  const addPaths = useAppStore((s) => s.addPaths)
  const setPreviewId = useAppStore((s) => s.setPreviewId)
  const appInfo = useAppStore((s) => s.appInfo)

  useEffect(() => {
    void init()
  }, [init])

  // 拖拽添加图片（含从 Finder/资源管理器拖入）
  useEffect(() => {
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }
    const onDrop = (e: DragEvent): void => {
      e.preventDefault()
      const paths: string[] = []
      for (const f of Array.from(e.dataTransfer?.files ?? [])) {
        try {
          paths.push(window.api.getPathForFile(f))
        } catch {
          /* 目录等非文件项忽略 */
        }
      }
      if (paths.length > 0) void addPaths(paths)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [addPaths])

  // 开发辅助：URL hash 参数 preview=文件名 打开大图预览、wm=JSON 应用水印配置（自动化验证用）
  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams(window.location.hash.slice(1))
    const wmJson = params.get('wm')
    if (wmJson) {
      try {
        useAppStore.getState().setWatermark(JSON.parse(wmJson))
      } catch {
        /* 非法 JSON 忽略 */
      }
    }
    const name = params.get('preview')
    if (name && images.length > 0) {
      const item = images.find((i) => i.fileName === name)
      if (item) setPreviewId(item.id)
    }
  }, [ready, images, setPreviewId])

  // Esc 关闭大图预览
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPreviewId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPreviewId])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <Toolbar onExport={() => setExportOpen(true)} />
      <main className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">{images.length === 0 ? <EmptyState /> : <ImageGrid />}</div>
        <WatermarkPanel />
      </main>
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-line bg-card px-4 text-[11px] text-ink-faint">
        <span>图片批量水印工具</span>
        {appInfo && (
          <span>
            v{appInfo.version} · {appInfo.platform} · {appInfo.arch}
          </span>
        )}
      </footer>
      <ProgressBar />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <PreviewModal />
      <Toasts />
    </div>
  )
}
