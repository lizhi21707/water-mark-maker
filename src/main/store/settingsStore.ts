import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { DEFAULT_TEMPLATE, DEFAULT_WATERMARK } from '../../shared/ipc'
import type { PersistedSettings } from '../../shared/types'

function defaults(): PersistedSettings {
  return {
    watermark: { ...DEFAULT_WATERMARK },
    lastOutDir: '',
    template: DEFAULT_TEMPLATE,
    conflictMode: 'rename'
  }
}

/** 用户设置 JSON 持久化（userData/settings.json，写盘 debounce 200ms） */
class SettingsStore {
  private file: string
  private data: PersistedSettings
  private timer: NodeJS.Timeout | null = null

  constructor() {
    this.file = join(app.getPath('userData'), 'settings.json')
    this.data = this.load()
  }

  private load(): PersistedSettings {
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf-8')) as Partial<PersistedSettings>
      return {
        ...defaults(),
        ...raw,
        watermark: { ...defaults().watermark, ...(raw.watermark ?? {}) }
      }
    } catch {
      return defaults()
    }
  }

  get(): PersistedSettings {
    return this.data
  }

  patch(patch: Partial<PersistedSettings>): void {
    this.data = { ...this.data, ...patch }
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 200)
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[settings] 写盘失败:', err)
    }
  }
}

export const settingsStore = new SettingsStore()
