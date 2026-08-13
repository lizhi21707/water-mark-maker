/** 三进程共享数据模型（禁止引入 Node/DOM API） */

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** auto: 竖图(H>W)自动旋转 90°；horizontal/vertical: 强制水平/垂直 */
export type RotationStrategy = 'auto' | 'horizontal' | 'vertical'

export interface WatermarkConfig {
  /** 水印文本，支持 \n 多行 */
  text: string
  position: WatermarkPosition
  /** 文字方向跨度占短边百分比（1–60） */
  sizePct: number
  /** 边距占短边百分比（0–30） */
  marginPct: number
  /** #RRGGBB */
  color: string
  /** 0–100 */
  opacity: number
  fontWeight: 400 | 700
  rotation: RotationStrategy
}

export interface ThumbResult {
  dataUrl: string
  width: number
  height: number
}

export type ImageStatus =
  | 'pending' // 缩略图生成中
  | 'ready'
  | 'thumb-error'
  | 'exported'
  | 'skipped'
  | 'failed'

export interface ImageItem {
  id: string
  filePath: string
  /** 含扩展名 */
  fileName: string
  /** 小写、无点 */
  ext: string
  /** 已按 EXIF 方向校正后的尺寸 */
  width: number
  height: number
  thumb: ThumbResult | null
  status: ImageStatus
  error?: string
}

export type ConflictMode = 'rename' | 'skip' | 'overwrite'

export interface ExportSettings {
  outDir: string
  /** 命名模板，如 '{name}_wm{ext}' */
  template: string
  conflictMode: ConflictMode
  /** 1–4 */
  concurrency: number
  /** jpeg/webp 输出质量 */
  quality: number
}

export interface ExportProgress {
  jobId: string
  done: number
  skipped: number
  failed: number
  total: number
  currentName: string
  status: 'running' | 'done' | 'cancelled' | 'error'
}

export interface AppInfo {
  version: string
  platform: string
  arch: string
}

export interface PersistedSettings {
  watermark: WatermarkConfig
  lastOutDir: string
  template: string
  conflictMode: ConflictMode
  windowBounds?: { x: number; y: number; width: number; height: number }
}
