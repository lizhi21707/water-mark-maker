import { app, dialog, ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { IPC } from '../shared/ipc'
import type { ExportSettings, PersistedSettings } from '../shared/types'
import * as imageService from './services/imageService'
import { cancelExport, isExporting, startExport } from './services/exportQueue'
import { settingsStore } from './store/settingsStore'

/** 渲染进程事件广播目标（由 index.ts 设置） */
let sendToRenderer: ((channel: string, payload: unknown) => void) | null = null

export function setRendererSender(fn: (channel: string, payload: unknown) => void): void {
  sendToRenderer = fn
  imageService.setChangeListener((items) => sendToRenderer?.(IPC.imagesUpdated, items))
}

function validatePaths(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export function registerIpc(): void {
  ipcMain.handle(IPC.appInfo, () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  }))

  ipcMain.handle(IPC.dialogOpenImages, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择图片',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'gif', 'heic', 'heif'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(IPC.dialogChooseDir, async (_e, defaultPath?: unknown) => {
    const result = await dialog.showOpenDialog({
      title: '选择输出目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: typeof defaultPath === 'string' && defaultPath ? defaultPath : undefined
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle(IPC.imagesAdd, (_e, paths: unknown) => {
    if (!validatePaths(paths)) return []
    return imageService.addImages(paths.filter((p) => imageService.isSupportedImage(p)))
  })

  ipcMain.handle(IPC.imagesRemove, (_e, id: unknown) => {
    if (typeof id === 'string') imageService.removeImage(id)
  })

  ipcMain.handle(IPC.imagesClear, () => {
    imageService.clearImages()
  })

  ipcMain.handle(IPC.thumbnailsGenerate, (_e, id: unknown) => {
    if (typeof id !== 'string') return null
    return imageService.generateThumbnail(id)
  })

  ipcMain.handle(IPC.imagesExport, (_e, settings: ExportSettings) => {
    if (!settings?.outDir || typeof settings.template !== 'string') {
      throw new Error('导出参数不完整')
    }
    const items = imageService.listImages()
    if (items.length === 0 || isExporting()) {
      throw new Error(isExporting() ? '已有导出任务进行中' : '没有可导出的图片')
    }
    const jobId = randomUUID()
    const watermark = settingsStore.get().watermark
    startExport(jobId, items, settings, watermark, (p) => sendToRenderer?.(IPC.exportProgress, p))
    return jobId
  })

  ipcMain.handle(IPC.exportCancel, (_e, jobId: unknown) => {
    if (typeof jobId === 'string') cancelExport(jobId)
  })

  ipcMain.handle(IPC.settingsGet, () => settingsStore.get())

  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<PersistedSettings>) => {
    settingsStore.patch(patch ?? {})
  })
}
