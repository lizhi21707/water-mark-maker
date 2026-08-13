import { useAppStore } from '../store/useAppStore'
import { IconAlert, IconCheck } from './Icons'

const KIND_STYLE = {
  info: 'bg-ink text-white',
  success: 'bg-ok text-white',
  error: 'bg-danger text-white'
} as const

export function Toasts(): React.JSX.Element {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] shadow-lg ${KIND_STYLE[t.kind]}`}
        >
          {t.kind === 'error' ? (
            <IconAlert size={14} />
          ) : t.kind === 'success' ? (
            <IconCheck size={14} />
          ) : null}
          {t.message}
        </div>
      ))}
    </div>
  )
}
