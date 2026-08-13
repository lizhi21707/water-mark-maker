import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { WATERMARK_FONT_FAMILY } from '../../shared/ipc'
import { buildSvg, computeLayout } from '../../shared/layout'
import type { WatermarkConfig } from '../../shared/types'
import { fontFile } from '../paths'

/**
 * 导出水印管线：computeLayout（与预览同一几何）→ buildSvg →
 * resvg 渲染（打包字体，双平台一致）→ sharp composite 流式输出，不整图入内存。
 */

function renderWatermarkPng(config: WatermarkConfig, imgW: number, imgH: number): Buffer | null {
  const layout = computeLayout(config, imgW, imgH)
  if (!layout) return null
  const svg = buildSvg(config, layout)
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [fontFile(400), fontFile(700)],
      loadSystemFonts: false,
      defaultFontFamily: WATERMARK_FONT_FAMILY
    }
  })
  return Buffer.from(resvg.render().asPng())
}

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'tiff'

export function mapOutputFormat(ext: string): OutputFormat {
  switch (ext.toLowerCase()) {
    case 'png':
    case 'bmp':
    case 'gif':
      return 'png'
    case 'webp':
      return 'webp'
    case 'tif':
    case 'tiff':
      return 'tiff'
    default:
      return 'jpeg' // jpg / heic / heif 及未知格式
  }
}

/**
 * 导出单张：EXIF 摆正 → 合成水印 → 转目标格式 → 写文件。
 * imgW/imgH 为摆正后的尺寸（imageService 已校正）。
 */
export async function exportImage(
  inputPath: string,
  outPath: string,
  config: WatermarkConfig,
  imgW: number,
  imgH: number,
  format: OutputFormat,
  quality: number
): Promise<void> {
  const overlay = renderWatermarkPng(config, imgW, imgH)
  const layout = overlay ? computeLayout(config, imgW, imgH) : null

  let pipe = sharp(inputPath, { sequentialRead: true, failOn: 'none' }).rotate()
  if (overlay && layout) {
    const left = Math.round(layout.cx - layout.blockW / 2)
    const top = Math.round(layout.cy - layout.blockH / 2)
    pipe = pipe.composite([{ input: overlay, left, top }])
  }
  switch (format) {
    case 'png':
      await pipe.png().toFile(outPath)
      break
    case 'webp':
      await pipe.webp({ quality }).toFile(outPath)
      break
    case 'tiff':
      await pipe.tiff().toFile(outPath)
      break
    default:
      await pipe.jpeg({ quality, mozjpeg: true }).toFile(outPath)
  }
}
