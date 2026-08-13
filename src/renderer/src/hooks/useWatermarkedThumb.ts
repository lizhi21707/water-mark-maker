import { useEffect, useState } from 'react'
import type { ImageItem, WatermarkConfig } from '@shared/types'
import { compositeThumb, ensureFont } from '../utils/previewCanvas'

/** 合成结果缓存：key = id + 配置 hash；视口内卡片复用，配置变化时仅重绘变化项 */
const cache = new Map<string, string>()
const MAX_CACHE = 600

export function configHash(c: WatermarkConfig): string {
  return JSON.stringify(c)
}

export function useWatermarkedThumb(
  item: ImageItem,
  config: WatermarkConfig
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const thumb = item.thumb
    if (!thumb) return

    const key = `${item.id}|${configHash(config)}`
    const hit = cache.get(key)
    if (hit) {
      setUrl(hit)
      return
    }

    const img = new Image()
    img.onload = () => {
      if (!alive) return
      ensureFont(config.fontWeight).then(() => {
        if (!alive) return
        const dataUrl = compositeThumb(img, config)
        cache.set(key, dataUrl)
        if (cache.size > MAX_CACHE) {
          const first = cache.keys().next().value
          if (first) cache.delete(first)
        }
        setUrl(dataUrl)
      })
    }
    img.src = thumb.dataUrl
    return () => {
      alive = false
    }
  }, [item, config])

  return url ?? item.thumb?.dataUrl ?? null
}
