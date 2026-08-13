import { create } from 'zustand'
import type {
  AppInfo,
  ConflictMode,
  ExportProgress,
  ImageItem,
  WatermarkConfig
} from '@shared/types'

interface Toast {
  id: number
  message: string
  kind: 'info' | 'error' | 'success'
}

export type ExportUiState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; progress: ExportProgress }
  | { phase: 'finished'; progress: ExportProgress }

interface AppState {
  ready: boolean
  images: ImageItem[]
  watermark: WatermarkConfig
  lastOutDir: string
  template: string
  conflictMode: ConflictMode
  appInfo: AppInfo | null
  previewId: string | null
  toasts: Toast[]
  exportUi: ExportUiState
  init: () => Promise<void>
  addPaths: (paths: string[]) => Promise<void>
  removeImage: (id: string) => Promise<void>
  clearImages: () => Promise<void>
  setWatermark: (patch: Partial<WatermarkConfig>) => void
  setExportPrefs: (patch: {
    lastOutDir?: string
    template?: string
    conflictMode?: ConflictMode
  }) => void
  setPreviewId: (id: string | null) => void
  startExport: (settings: {
    outDir: string
    template: string
    conflictMode: ConflictMode
    concurrency: number
    quality: number
  }) => Promise<void>
  cancelExport: () => Promise<void>
  dismissExport: () => void
  toast: (message: string, kind?: Toast['kind']) => void
}

let toastSeq = 0

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  images: [],
  watermark: {
    text: '© 2026 我的照片',
    position: 'bottom-right',
    sizePct: 20,
    marginPct: 3,
    color: '#ffffff',
    opacity: 60,
    fontWeight: 400,
    rotation: 'auto'
  },
  lastOutDir: '',
  template: '{name}_wm{ext}',
  conflictMode: 'rename',
  appInfo: null,
  previewId: null,
  toasts: [],
  exportUi: { phase: 'idle' },

  init: async () => {
    window.api.onImagesUpdated((items) => set({ images: items }))
    window.api.onExportProgress((p) => {
      if (p.status === 'running') {
        set({ exportUi: { phase: 'running', jobId: p.jobId, progress: p } })
      } else {
        set({ exportUi: { phase: 'finished', progress: p } })
      }
    })
    const [settings, appInfo] = await Promise.all([
      window.api.getSettings(),
      window.api.getAppInfo()
    ])
    set({
      watermark: settings.watermark,
      lastOutDir: settings.lastOutDir,
      template: settings.template,
      conflictMode: settings.conflictMode,
      appInfo,
      ready: true
    })
  },

  addPaths: async (paths) => {
    if (paths.length === 0) return
    const added = await window.api.addImages(paths)
    const failed = added.filter((i) => i.status === 'thumb-error')
    if (failed.length > 0) {
      get().toast(`${failed.length} 张图片无法读取，已跳过`, 'error')
    }
  },

  removeImage: async (id) => {
    await window.api.removeImage(id)
  },

  clearImages: async () => {
    await window.api.clearImages()
    set({ images: [] })
  },

  setWatermark: (patch) => {
    const watermark = { ...get().watermark, ...patch }
    set({ watermark })
    void window.api.setSettings({ watermark })
  },

  setExportPrefs: (patch) => {
    set({ ...patch })
    void window.api.setSettings(patch)
  },

  setPreviewId: (previewId) => set({ previewId }),

  startExport: async (settings) => {
    // 记忆导出偏好
    get().setExportPrefs({
      lastOutDir: settings.outDir,
      template: settings.template,
      conflictMode: settings.conflictMode
    })
    try {
      const jobId = await window.api.exportImages(settings)
      set({
        exportUi: {
          phase: 'running',
          jobId,
          progress: {
            jobId,
            done: 0,
            skipped: 0,
            failed: 0,
            total: get().images.length,
            currentName: '',
            status: 'running'
          }
        }
      })
    } catch (err) {
      get().toast(err instanceof Error ? err.message : '导出启动失败', 'error')
    }
  },

  cancelExport: async () => {
    const { exportUi } = get()
    if (exportUi.phase === 'running') {
      await window.api.cancelExport(exportUi.jobId)
    }
  },

  dismissExport: () => set({ exportUi: { phase: 'idle' } }),

  toast: (message, kind = 'info') => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2600)
  }
}))
