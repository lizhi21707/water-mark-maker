import { app } from 'electron'
import { join } from 'path'

export const isDev = !app.isPackaged

/** 资源目录：dev 为项目 resources/，打包后为 process.resourcesPath */
export function resourcesDir(): string {
  return isDev ? join(app.getAppPath(), 'resources') : process.resourcesPath
}

/** 字体目录（resvg 渲染水印文本用） */
export function fontsDir(): string {
  return join(resourcesDir(), 'fonts')
}

export function fontFile(weight: 400 | 700): string {
  return join(fontsDir(), weight === 700 ? 'NotoSansCJKsc-Bold.otf' : 'NotoSansCJKsc-Regular.otf')
}
