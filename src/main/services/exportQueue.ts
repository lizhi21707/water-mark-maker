import { readdirSync } from 'fs'
import { join } from 'path'
import type { ExportProgress, ExportSettings, ImageItem, WatermarkConfig } from '../../shared/types'
import { createQueue } from '../utils/queue'
import { setImageStatus } from './imageService'
import { exportImage, mapOutputFormat, type OutputFormat } from './watermarkService'
import { mapOutputExt, resolveOutputName, scanReserved } from './nameResolver'

/**
 * 导出队列：任务级并发（默认 2）、张级进度推送、原子取消（任务边界生效）。
 * 同一时刻仅允许一个导出任务；水印配置取自 settingsStore（导出时的当前配置）。
 */

interface ActiveJob {
  jobId: string
  cancel: () => void
}

let activeJob: ActiveJob | null = null

export function isExporting(): boolean {
  return activeJob !== null
}

export function startExport(
  jobId: string,
  items: ImageItem[],
  settings: ExportSettings,
  watermark: WatermarkConfig,
  onProgress: (p: ExportProgress) => void
): void {
  if (activeJob) throw new Error('已有导出任务进行中')
  let cancelled = false
  activeJob = { jobId, cancel: () => (cancelled = true) }

  const reserved = scanReserved(settings.outDir, readdirSync)
  const now = new Date()
  const total = items.length
  let done = 0
  let skipped = 0
  let failed = 0
  let currentName = ''

  const emit = (status: ExportProgress['status']): void => {
    onProgress({ jobId, done, skipped, failed, total, currentName, status })
  }

  void (async () => {
    emit('running')

    const queue = createQueue<{ item: ImageItem; index: number }>(
      Math.min(Math.max(settings.concurrency, 1), 4),
      async ({ item, index }) => {
        if (cancelled) return
        const resolved = resolveOutputName(
          item,
          index,
          total,
          settings.template,
          reserved,
          settings.conflictMode,
          now
        )
        currentName = resolved.name
        if (resolved.skipped) {
          skipped++
          setImageStatus(item.id, 'skipped')
          emit('running')
          return
        }
        reserved.add(resolved.name.toLowerCase())
        const outPath = join(settings.outDir, resolved.name)
        try {
          const format: OutputFormat = mapOutputFormat(mapOutputExt(item.ext))
          await exportImage(item.filePath, outPath, watermark, item.width, item.height, format, settings.quality, item.createdAt)
          done++
          setImageStatus(item.id, 'exported')
        } catch (err) {
          failed++
          console.error('[export] 失败:', item.fileName, err)
          setImageStatus(item.id, 'failed')
        }
        emit('running')
      }
    )

    items.forEach((item, index) => queue.push({ item, index }))
    await queue.drain()

    emit(cancelled ? 'cancelled' : 'done')
    activeJob = null
  })()
}

export function cancelExport(jobId: string): void {
  if (activeJob && activeJob.jobId === jobId) {
    activeJob.cancel()
  }
}
