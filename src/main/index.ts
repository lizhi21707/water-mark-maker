import { app, BrowserWindow, Menu, net, protocol, session } from 'electron'
import { readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { IMG_SCHEME } from '../shared/ipc'
import { registerIpc, setRendererSender } from './ipc'
import { addImages, getImagePath, isSupportedImage } from './services/imageService'
import { settingsStore } from './store/settingsStore'

// 自定义协议必须在使用前注册特权（仅能读取会话内已添加的图片）
protocol.registerSchemesAsPrivileged([
  { scheme: IMG_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' wm-img: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'"
].join('; ')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = settingsStore.get().windowBounds
  mainWindow = new BrowserWindow({
    title: '水印工具',
    width: bounds?.width ?? 1200,
    height: bounds?.height ?? 800,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.on('close', () => {
    if (!mainWindow) return
    settingsStore.patch({ windowBounds: mainWindow.getBounds() })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 纵深防御：拒绝新窗口与页面跳转
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== mainWindow?.webContents.getURL()) e.preventDefault()
  })

  // 开发辅助：WM_AUTOLOAD=/dir 时自动添加目录内全部图片（自动化验证用）
  const autoloadDir = process.env['WM_AUTOLOAD']
  if (autoloadDir) {
    mainWindow.webContents.once('did-finish-load', () => {
      try {
        const files = readdirSync(autoloadDir)
          .filter((f) => isSupportedImage(f))
          .map((f) => join(autoloadDir, f))
        void addImages(files).then((items) => {
          // 开发辅助：WM_EXPORT=/dir 时加载完成后自动导出（自动化验证用）
          const exportDir = process.env['WM_EXPORT']
          if (exportDir) {
            const s = settingsStore.get()
            void import('./services/exportQueue').then(({ startExport }) => {
              startExport(
                'auto-test',
                items.filter((i) => i.status !== 'thumb-error'),
                {
                  outDir: exportDir,
                  template: s.template,
                  conflictMode: s.conflictMode,
                  concurrency: 2,
                  quality: 90
                },
                s.watermark,
                (p) => console.log(`[auto-export] ${p.status} ${p.done + p.skipped + p.failed}/${p.total} done=${p.done} skip=${p.skipped} fail=${p.failed}`)
              )
            })
          }
        })
      } catch (err) {
        console.error('[autoload] failed:', err)
      }
    })
  }

  // 开发辅助：WM_SCREENSHOT=/path.png 时加载完成后截图退出（自动化验证用）
  const screenshotPath = process.env['WM_SCREENSHOT']
  if (screenshotPath && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      const delay = Number(process.env['WM_SCREENSHOT_DELAY'] ?? 2000)
      setTimeout(async () => {
        try {
          // WM_SCROLL=0-1 时先滚动网格到指定比例（验证虚拟化滚动）
          const scrollTo = Number(process.env['WM_SCROLL'])
          if (!Number.isNaN(scrollTo)) {
            await mainWindow?.webContents.executeJavaScript(
              `(() => { const el = document.querySelector('[data-grid-scroll]'); if (el) el.scrollTop = el.scrollHeight * ${scrollTo}; return el?.scrollTop ?? -1 })()`
            )
            await new Promise((r) => setTimeout(r, 800))
          }
          const img = await mainWindow?.webContents.capturePage()
          if (img) writeFileSync(screenshotPath, img.toPNG())
          console.log('[screenshot] saved to', screenshotPath)
        } catch (err) {
          console.error('[screenshot] failed:', err)
        }
        app.quit()
      }, delay)
    })
  }

  // 开发辅助：WM_PREVIEW=文件名 / WM_WATERMARK=JSON 时自动打开预览、应用水印配置（自动化验证用）
  const qs = new URLSearchParams()
  if (process.env['WM_PREVIEW']) qs.set('preview', process.env['WM_PREVIEW'])
  if (process.env['WM_WATERMARK']) qs.set('wm', process.env['WM_WATERMARK'])
  const hash = qs.toString() ? `#${qs.toString()}` : ''
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + hash)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: hash || undefined })
  }
}

// 单实例锁：重复启动时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)

    // wm-img://img/{id} —— 白名单校验后由 Chromium 解码，JS 零拷贝
    protocol.handle(IMG_SCHEME, (req) => {
      const id = decodeURIComponent(new URL(req.url).pathname.replace(/^\//, ''))
      const p = id ? getImagePath(id) : undefined
      if (!p) return new Response('Not Found', { status: 404 })
      return net.fetch(pathToFileURL(p).toString())
    })

    // 生产环境注入严格 CSP（dev 由 vite 服务，无需注入）
    if (app.isPackaged) {
      session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
        cb({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [PROD_CSP]
          }
        })
      })
    }

    setRendererSender((channel, payload) => {
      mainWindow?.webContents.send(channel, payload)
    })
    registerIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    settingsStore.flush()
  })
}
