// 生成应用图标 build/icon.png（1024×1024）：紫白配色、长方形、右下角圆点（水印位置意象）。
// 用法：node scripts/generateIcon.js
const { join } = require('path')
const sharp = require('sharp')

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="0.55" stop-color="#6d28d9"/>
      <stop offset="1" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ede9fe"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#2e1065" flood-opacity="0.45"/>
    </filter>
    <filter id="soft-sm" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#2e1065" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- 长方形紫底 -->
  <rect x="64" y="64" width="896" height="896" rx="210" fill="url(#bg)"/>
  <!-- 顶部玻璃高光 -->
  <rect x="64" y="64" width="896" height="896" rx="210" fill="url(#sheen)"/>

  <!-- 白色照片卡（左上） -->
  <rect x="208" y="208" width="480" height="480" rx="108" fill="url(#card)" filter="url(#soft)"/>
  <!-- 卡内细描边 + 山形水印意象 -->
  <rect x="240" y="240" width="416" height="416" rx="84" fill="none" stroke="#8b5cf6" stroke-opacity="0.18" stroke-width="8"/>
  <path d="M298 500 q150 -110 300 0" fill="none" stroke="#c4b5fd" stroke-width="30" stroke-linecap="round"/>

  <!-- 右下角圆点（水印位置） -->
  <circle cx="724" cy="724" r="66" fill="#ffffff" filter="url(#soft-sm)"/>
</svg>`

sharp(Buffer.from(svg))
  .png()
  .toFile(join(__dirname, '..', 'build', 'icon.png'))
  .then(() => console.log('icon generated: build/icon.png'))
