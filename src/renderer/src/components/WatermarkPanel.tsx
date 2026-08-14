import type { ReactNode } from 'react'
import { DATE_FORMAT_PRESETS, DATE_FORMAT_SAMPLE, formatDate } from '@shared/date'
import type { RotationStrategy, WatermarkConfig } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { PositionPicker } from './PositionPicker'

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#64748b',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#0ea5e9',
  '#4f46e5',
  '#ec4899'
]

const ROTATION_OPTIONS: Array<{ value: RotationStrategy; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'horizontal', label: '水平' },
  { value: 'vertical', label: '垂直' }
]

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold text-ink-soft">{title}</h3>
      {children}
    </section>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] text-ink-soft">{label}</span>
        <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="wm-range w-full"
      />
    </div>
  )
}

export function WatermarkPanel(): React.JSX.Element {
  const watermark = useAppStore((s) => s.watermark)
  const setWatermark = useAppStore((s) => s.setWatermark)
  const set = (patch: Partial<WatermarkConfig>): void => setWatermark(patch)

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-line bg-card">
      <div className="space-y-6 p-4">
        <Section title="水印内容">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={watermark.usePhotoDate}
              onChange={(e) => set({ usePhotoDate: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="text-[12px] text-ink">使用照片创建日期</span>
          </label>
          {watermark.usePhotoDate && (
            <div className="space-y-1">
              <select
                value={watermark.dateFormat}
                onChange={(e) => set({ dateFormat: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {DATE_FORMAT_PRESETS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {formatDate(DATE_FORMAT_SAMPLE, fmt)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                每张照片使用各自的拍摄/创建日期；无日期信息时回退下方文本。
              </p>
            </div>
          )}
          <textarea
            value={watermark.text}
            onChange={(e) => set({ text: e.target.value })}
            rows={2}
            disabled={watermark.usePhotoDate}
            placeholder={
              watermark.usePhotoDate
                ? `如：${formatDate(DATE_FORMAT_SAMPLE, watermark.dateFormat)}`
                : '输入水印文本\n支持多行'
            }
            className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-bg"
          />
        </Section>

        <Section title="位置">
          <PositionPicker value={watermark.position} onChange={(p) => set({ position: p })} />
          <SliderRow
            label="边距"
            value={watermark.marginPct}
            min={0}
            max={30}
            suffix="%"
            onChange={(v) => set({ marginPct: v })}
          />
        </Section>

        <Section title="样式">
          <SliderRow
            label="大小"
            value={watermark.sizePct}
            min={1}
            max={60}
            suffix="%"
            onChange={(v) => set({ sizePct: v })}
          />
          <SliderRow
            label="透明度"
            value={watermark.opacity}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => set({ opacity: v })}
          />
          <div>
            <span className="mb-1.5 block text-[12px] text-ink-soft">颜色</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => set({ color: c })}
                  title={c}
                  className={`h-6 w-6 rounded-full border transition-transform duration-150 hover:scale-110 ${
                    watermark.color.toLowerCase() === c
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-line'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label
                className="relative ml-1 flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-ink-faint text-[13px] text-ink-soft transition-colors hover:border-primary hover:text-primary"
                title="自定义颜色"
              >
                +
                <input
                  type="color"
                  value={watermark.color}
                  onChange={(e) => set({ color: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <span className="ml-1 font-mono text-[11px] text-ink-faint">
                {watermark.color.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 text-[12px] text-ink-soft">字体</span>
            <div className="flex flex-1 overflow-hidden rounded-lg border border-line">
              {(
                [
                  { w: 400 as const, label: '常规' },
                  { w: 700 as const, label: '加粗' }
                ]
              ).map(({ w, label }) => (
                <button
                  key={w}
                  onClick={() => set({ fontWeight: w })}
                  className={`flex-1 py-1.5 text-[12px] transition-colors duration-150 ${
                    watermark.fontWeight === w
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'bg-white text-ink-soft hover:bg-bg'
                  }`}
                  style={w === 700 ? { fontWeight: 700 } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 text-[12px] text-ink-soft">方向</span>
            <div className="flex flex-1 overflow-hidden rounded-lg border border-line">
              {ROTATION_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => set({ rotation: value })}
                  className={`flex-1 py-1.5 text-[12px] transition-colors duration-150 ${
                    watermark.rotation === value
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'bg-white text-ink-soft hover:bg-bg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <p className="text-[11px] leading-relaxed text-ink-faint">
          大小与边距按图片短边百分比计算；方向为「自动」时，竖图水印自动旋转 90°
          自上而下排列，横图保持水平。
        </p>
      </div>
    </aside>
  )
}
