// Windows 打包包装：npm 脚本里不能写 `VAR=x cmd`（cmd.exe 不支持行内环境变量赋值），
// 统一在这里设置环境后调用。npmmirror 镜像仅本地（中国网络）使用，CI 走 GitHub 默认源。
const { spawnSync } = require('child_process')

const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
if (!env.CI && !env.ELECTRON_BUILDER_BINARIES_MIRROR) {
  env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npx', ['electron-vite', 'build'])
run('npx', ['electron-builder', '--win', 'nsis'])
