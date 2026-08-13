import { useEffect, useState } from 'react'
import type { ConflictMode } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { IconFolder, IconX } from './Icons'

const CONFLICT_OPTIONS: Array<{ value: ConflictMode; label: string; hint: string }> = [
  { value: 'rename', label: '自动重命名', hint: '同名时追加 _1、_2' },
  { value: 'skip', label: '跳过', hint: '已存在的文件不导出' },
  { value: 'overwrite', label: '覆盖', hint: '直接覆盖同名文件' }
]

const TOKEN_HINT = '{name} 原名 · {ext} 扩展名 · {n} 序号 · {count} 总数 · {date} 日期 · {time} 时间'

export function ExportDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element | null {
  const store = useAppStore()
  const [outDir, setOutDir] = useState(store.lastOutDir)
  const [template, setTemplate] = useState(store.template)
  const [conflictMode, setConflictMode] = useState<ConflictMode>(store.conflictMode)
  const [concurrency, setConcurrency] = useState(2)
  const [quality, setQuality] = useState(90)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (open) {
      setOutDir(store.lastOutDir)
      setTemplate(store.template)
      setConflictMode(store.conflictMode)
    }
  }, [open, store.lastOutDir, store.template, store.conflictMode])

  if (!open) return null

  const chooseDir = async (): Promise<void> => {
    const d = await window.api.pickDir(outDir || undefined)
    if (d) setOutDir(d)
  }

  const start = async (): Promise<void> => {
    if (!outDir || starting) return
    setStarting(true)
    await store.startExport({ outDir, template, conflictMode, concurrency, quality })
    setStarting(false)
    onClose()
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[440px] rounded-2xl bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">导出图片</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-bg hover:text-ink"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] text-ink-soft">输出目录</label>
            <div className="flex gap-2">
              <input
                value={outDir}
                onChange={(e) => setOutDir(e.target.value)}
                placeholder="选择或输入输出目录"
                className={inputCls}
              />
              <button
                onClick={() => void chooseDir()}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:border-primary hover:text-primary"
                title="选择目录"
              >
                <IconFolder size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-ink-soft">命名模板</label>
            <input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">{TOKEN_HINT}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-ink-soft">同名文件处理</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CONFLICT_OPTIONS.map(({ value, label, hint }) => (
                <button
                  key={value}
                  onClick={() => setConflictMode(value)}
                  title={hint}
                  className={`rounded-lg border px-2 py-1.5 text-center transition-colors duration-150 ${
                    conflictMode === value
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-line bg-white text-ink-soft hover:bg-bg'
                  }`}
                >
                  <span className="block text-[12px] font-medium">{label}</span>
                  <span className="block text-[10px] opacity-70">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] text-ink-soft">并发数</label>
              <div className="flex overflow-hidden rounded-lg border border-line">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConcurrency(n)}
                    className={`flex-1 py-1.5 text-[12px] transition-colors ${
                      concurrency === n
                        ? 'bg-primary-soft font-semibold text-primary'
                        : 'bg-white text-ink-soft hover:bg-bg'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 flex justify-between text-[12px] text-ink-soft">
                <span>JPEG 质量</span>
                <span className="font-mono text-[11px] text-ink">{quality}</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="wm-range mt-2 w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-[13px] text-ink-soft transition-colors hover:bg-bg hover:text-ink"
          >
            取消
          </button>
          <button
            onClick={() => void start()}
            disabled={!outDir || starting}
            className="h-9 rounded-lg bg-primary px-5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            开始导出（{store.images.length} 张）
          </button>
        </div>
      </div>
    </div>
  )
}
