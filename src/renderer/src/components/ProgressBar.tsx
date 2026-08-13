import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { IconX } from './Icons'

/** 底部导出进度条：运行中显示进度与取消，结束后显示结果并可关闭 */
export function ProgressBar(): React.JSX.Element | null {
  const exportUi = useAppStore((s) => s.exportUi)
  const cancelExport = useAppStore((s) => s.cancelExport)
  const dismissExport = useAppStore((s) => s.dismissExport)
  const toast = useAppStore((s) => s.toast)
  const prevPhase = useRef(exportUi.phase)

  // 完成/取消时弹 toast（仅状态迁移瞬间）
  useEffect(() => {
    if (prevPhase.current === exportUi.phase) return
    prevPhase.current = exportUi.phase
    if (exportUi.phase === 'finished') {
      const p = exportUi.progress
      const title = p.status === 'cancelled' ? '导出已取消' : '导出完成'
      const parts = [`${p.done} 张成功`]
      if (p.skipped > 0) parts.push(`${p.skipped} 张跳过`)
      if (p.failed > 0) parts.push(`${p.failed} 张失败`)
      toast(`${title}：${parts.join('，')}`, p.failed > 0 ? 'error' : 'success')
    }
  }, [exportUi, toast])

  if (exportUi.phase === 'idle') return null

  const p = exportUi.progress
  const running = exportUi.phase === 'running'
  const doneCount = p.done + p.skipped + p.failed
  const pct = p.total > 0 ? Math.round((doneCount / p.total) * 100) : 0

  return (
    <div className="absolute inset-x-0 bottom-7 z-40 border-t border-line bg-card px-4 py-2.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <span className="w-48 shrink-0 truncate text-[12px] text-ink-soft">
          {running
            ? `正在导出 ${doneCount}/${p.total}${p.currentName ? ` · ${p.currentName}` : ''}`
            : p.status === 'cancelled'
              ? `已取消 · 完成 ${doneCount}/${p.total}`
              : `已完成 ${doneCount}/${p.total}`}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${
              p.status === 'cancelled' ? 'bg-ink-faint' : p.failed > 0 ? 'bg-danger' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-ink-faint">{pct}%</span>
        {running ? (
          <button
            onClick={() => void cancelExport()}
            className="h-7 rounded-md px-2.5 text-[12px] text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
          >
            取消
          </button>
        ) : (
          <button
            onClick={dismissExport}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-bg hover:text-ink"
            title="关闭"
          >
            <IconX size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
