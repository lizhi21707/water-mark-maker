import { createHash } from 'crypto'
import { basename, extname } from 'path'
import sharp, { type Metadata } from 'sharp'
import type { ImageItem, ThumbResult } from '../../shared/types'
import { createdTimeMs } from '../utils/exif'
import { createQueue } from '../utils/queue'

const THUMB_SIZE = 320
const THUMB_CONCURRENCY = 4

// 注：不含 bmp —— sharp 预编译 libvips 无 BMP 解码器
const SUPPORTED_EXT = /\.(jpe?g|png|webp|tiff?|gif|heic|heif)$/i

/** 会话图片表（id → item），同时作为 wm-img 协议白名单 */
const images = new Map<string, ImageItem>()
let onChange: ((items: ImageItem[]) => void) | null = null

const thumbQueue = createQueue<string>(THUMB_CONCURRENCY, async (id) => {
  await generateThumbnail(id)
})

export function setChangeListener(fn: (items: ImageItem[]) => void): void {
  onChange = fn
}

function notify(): void {
  onChange?.(listImages())
}

function makeId(filePath: string): string {
  return 'f_' + createHash('sha1').update(filePath).digest('hex').slice(0, 12)
}

export function isSupportedImage(path: string): boolean {
  return SUPPORTED_EXT.test(path)
}

export function getImagePath(id: string): string | undefined {
  return images.get(id)?.filePath
}

export function listImages(): ImageItem[] {
  return [...images.values()]
}

/** 按 EXIF 方向校正后的宽高（orientation 5–8 需交换） */
function orientedSize(meta: Metadata): { width: number; height: number } {
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const o = meta.orientation ?? 1
  return o >= 5 && o <= 8 ? { width: h, height: w } : { width: w, height: h }
}

/** 添加图片（去重 + 元数据 + 入缩略图队列），失败项带 error 返回 */
export async function addImages(paths: string[]): Promise<ImageItem[]> {
  const added: ImageItem[] = []
  const seen = new Set(listImages().map((i) => i.filePath))

  for (const p of paths) {
    if (seen.has(p)) continue
    seen.add(p)
    const item: ImageItem = {
      id: makeId(p),
      filePath: p,
      fileName: basename(p),
      ext: extname(p).slice(1).toLowerCase(),
      width: 0,
      height: 0,
      createdAt: null,
      thumb: null,
      status: 'pending'
    }
    try {
      const meta = await sharp(p).metadata()
      const size = orientedSize(meta)
      item.width = size.width
      item.height = size.height
      item.createdAt = await createdTimeMs(p, meta.exif)
      images.set(item.id, item)
      added.push(item)
      thumbQueue.push(item.id)
    } catch {
      item.status = 'thumb-error'
      item.error = '无法读取图片'
      added.push(item)
    }
  }
  notify()
  return added
}

export async function generateThumbnail(id: string): Promise<ThumbResult | null> {
  const item = images.get(id)
  if (!item) return null
  try {
    // rotate() 按 EXIF 自动摆正，缩略图宽高即校正后的宽高
    const buf = await sharp(item.filePath, { failOn: 'none' })
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
    const meta = await sharp(buf).metadata()
    const thumb: ThumbResult = {
      dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
      width: meta.width ?? 0,
      height: meta.height ?? 0
    }
    item.thumb = thumb
    item.status = 'ready'
    delete item.error
    notify()
    return thumb
  } catch (err) {
    item.status = 'thumb-error'
    item.error = '缩略图生成失败'
    notify()
    return null
  }
}

export function removeImage(id: string): void {
  images.delete(id)
  notify()
}

/** 导出状态回写（exported / skipped / failed） */
export function setImageStatus(id: string, status: ImageItem['status']): void {
  const item = images.get(id)
  if (!item) return
  item.status = status
  notify()
}

export function clearImages(): void {
  images.clear()
  thumbQueue.clear()
  notify()
}
