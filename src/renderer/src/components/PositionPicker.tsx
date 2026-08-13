import type { WatermarkPosition } from '@shared/types'

const CELLS: WatermarkPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
]

export function PositionPicker({
  value,
  onChange
}: {
  value: WatermarkPosition
  onChange: (p: WatermarkPosition) => void
}): React.JSX.Element {
  return (
    <div
      className="grid grid-cols-3 gap-1.5 rounded-lg bg-bg p-1.5"
      role="radiogroup"
      aria-label="水印位置"
    >
      {CELLS.map((pos) => (
        <button
          key={pos}
          role="radio"
          aria-checked={value === pos}
          onClick={() => onChange(pos)}
          className={`flex h-9 items-center justify-center rounded-md transition-all duration-150 ${
            value === pos
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-faint hover:bg-white hover:text-ink hover:shadow-sm'
          }`}
          title={pos}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              value === pos ? 'bg-white' : 'bg-current'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
