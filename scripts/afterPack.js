// 打包后裁剪：删除与目标平台/架构不符的原生二进制（sharp / resvg-js 的平台包）。
// electron-builder 默认把全部平台包都塞进安装包（x64 dmg 里带 arm64 的 libvips ~17MB、
// win32 的 resvg ~4MB 等），每个架构包约可省 20~25 MB。
const { join } = require('path')
const { existsSync, readdirSync, rmSync } = require('fs')
const { Arch } = require('builder-util')

const VENDOR_SCOPES = ['@img', '@resvg']

/** context.arch 是 Arch 枚举值（x64=1, arm64=3），不是字符串，转成名字再比较。 */
function archName(arch) {
  return Arch[arch] || String(arch)
}

/** 需要删除的包名模式（作用于 @img / @resvg 下的平台包目录名）。 */
function wrongPackagePatterns(electronPlatformName, arch) {
  const wrong = []
  if (electronPlatformName === 'darwin') {
    wrong.push(`.*-darwin-${archName(arch) === 'x64' ? 'arm64' : 'x64'}$`)
    wrong.push('.*-win32-.*', '.*-linux.*')
  } else if (electronPlatformName === 'win32') {
    wrong.push('.*-darwin-.*', '.*-linux.*')
  }
  return wrong
}

function matchesAny(name, patterns) {
  return patterns.some((p) => new RegExp(p).test(name))
}

/** 删除 dir/node_modules/@img、@resvg 下匹配模式的包目录。 */
function pruneDir(dir, patterns) {
  for (const scope of VENDOR_SCOPES) {
    const base = join(dir, 'node_modules', scope)
    if (!existsSync(base)) continue
    for (const entry of readdirSync(base)) {
      if (matchesAny(entry, patterns)) {
        rmSync(join(base, entry), { recursive: true, force: true })
        console.log(`[afterPack] pruned ${scope}/${entry}`)
      }
    }
  }
}

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, arch, packager } = context
  const patterns = wrongPackagePatterns(electronPlatformName, arch)
  if (!patterns.length) return

  // appOutDir 是包含 .app / win-unpacked 的目录，用 packager 定位 Resources 目录。
  // 注意只删 app.asar.unpacked（原生二进制都在这里）；asar 内的 "unpacked" 占位元数据
  // 不指向会被运行时访问的文件（错架构包永远不会被 require），sanityCheck 只读入口文件，
  // 签名又因 identity: null 跳过，留着元数据无害。
  const resourcesDir = packager.getResourcesDir(appOutDir)
  const unpacked = join(resourcesDir, 'app.asar.unpacked')
  if (existsSync(unpacked)) pruneDir(unpacked, patterns)
}
