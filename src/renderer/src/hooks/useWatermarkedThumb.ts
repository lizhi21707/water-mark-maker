import { useEffect, useState } from 'react'
import { resolveWatermarkText } from '@shared/date'
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
  // 「使用照片创建日期」时按该照片时间解析水印文本（缓存 key 已含 id，互不串扰）
  const effConfig: WatermarkConfig = {
    ...config,
    text: resolveWatermarkText(config, item.createdAt)
  }

  useEffect(() => {
    let alive = true
    const thumb = item.thumb
    if (!thumb) return

    const key = `${item.id}|${configHash(effConfig)}`
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
        const dataUrl = compositeThumb(img, effConfig)
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
