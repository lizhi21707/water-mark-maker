import type { WatermarkConfig } from './types'

/** IPC channel 常量（三进程共享） */
export const IPC = {
  dialogOpenImages: 'dialog:openImages',
  dialogChooseDir: 'dialog:chooseDir',
  imagesAdd: 'images:add',
  imagesRemove: 'images:remove',
  imagesClear: 'images:clear',
  thumbnailsGenerate: 'thumbnails:generate',
  imagesExport: 'images:export',
  exportCancel: 'export:cancel',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  appInfo: 'app:info',
  // main → renderer 事件
  exportProgress: 'export:progress',
  imagesUpdated: 'images:updated'
} as const

/** 大图预览自定义协议（仅能读取会话内已添加的图片） */
export const IMG_SCHEME = 'wm-img'

/** 打包字体协议（从 resources/fonts 服务，renderer 与 main 共用一份） */
export const FONT_SCHEME = 'wmm-fonts'

/** 水印合成字体（main 与 renderer 使用同一字体文件，保证渲染一致） */
export const WATERMARK_FONT_FAMILY = 'Noto Sans CJK SC'

export const DEFAULT_TEMPLATE = '{name}_wm{ext}'

export const DEFAULT_WATERMARK: WatermarkConfig = {
  text: '© 2026 我的照片',
  position: 'bottom-right',
  sizePct: 20,
  marginPct: 3,
  color: '#ffffff',
  opacity: 60,
  fontWeight: 400,
  rotation: 'auto'
}
