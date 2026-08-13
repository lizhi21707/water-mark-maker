import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IMG_SCHEME, IPC } from '../shared/ipc'
import type {
  AppInfo,
  ExportProgress,
  ExportSettings,
  ImageItem,
  PersistedSettings,
  ThumbResult
} from '../shared/types'

export interface Api {
  pickImages(): Promise<string[]>
  pickDir(defaultPath?: string): Promise<string | null>
  addImages(paths: string[]): Promise<ImageItem[]>
  removeImage(id: string): Promise<void>
  clearImages(): Promise<void>
  generateThumbnail(id: string): Promise<ThumbResult | null>
  exportImages(settings: ExportSettings): Promise<string>
  cancelExport(jobId: string): Promise<void>
  onExportProgress(cb: (p: ExportProgress) => void): () => void
  onImagesUpdated(cb: (items: ImageItem[]) => void): () => void
  getSettings(): Promise<PersistedSettings>
  setSettings(patch: Partial<PersistedSettings>): Promise<void>
  getAppInfo(): Promise<AppInfo>
  /** 拖拽文件 → 绝对路径（Electron 29+ webUtils） */
  getPathForFile(file: File): string
  /** 大图预览 URL（wm-img 协议） */
  imageUrl(id: string): string
}

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: Api = {
  pickImages: () => ipcRenderer.invoke(IPC.dialogOpenImages),
  pickDir: (defaultPath?: string) => ipcRenderer.invoke(IPC.dialogChooseDir, defaultPath),
  addImages: (paths: string[]) => ipcRenderer.invoke(IPC.imagesAdd, paths),
  removeImage: (id: string) => ipcRenderer.invoke(IPC.imagesRemove, id),
  clearImages: () => ipcRenderer.invoke(IPC.imagesClear),
  generateThumbnail: (id: string) => ipcRenderer.invoke(IPC.thumbnailsGenerate, id),
  exportImages: (settings: ExportSettings) => ipcRenderer.invoke(IPC.imagesExport, settings),
  cancelExport: (jobId: string) => ipcRenderer.invoke(IPC.exportCancel, jobId),
  onExportProgress: (cb) => on<ExportProgress>(IPC.exportProgress, cb),
  onImagesUpdated: (cb) => on<ImageItem[]>(IPC.imagesUpdated, cb),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  getAppInfo: () => ipcRenderer.invoke(IPC.appInfo),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  imageUrl: (id: string) => `${IMG_SCHEME}://img/${id}`
}

contextBridge.exposeInMainWorld('api', api)
