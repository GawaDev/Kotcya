import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const icon = await readFile(new URL('../public/favicon.svg', import.meta.url));
const output = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

await Promise.all([
  sharp(icon).resize(64, 64).png().toFile(output('favicon.png')),
  sharp(icon).resize(180, 180).png().toFile(output('apple-touch-icon.png')),
  sharp(icon).resize(192, 192).png().toFile(output('pwa-192.png')),
  sharp(icon).resize(512, 512).png().toFile(output('pwa-512.png')),
  sharp({
    create: { width: 512, height: 512, channels: 4, background: '#eaf5ec' },
  })
    .composite([{ input: await sharp(icon).resize(360, 360).png().toBuffer(), left: 76, top: 76 }])
    .png()
    .toFile(output('pwa-maskable-512.png')),
]);

const encodedIcon = icon.toString('base64');
const social = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#f4f8f5"/>
    <rect x="72" y="72" width="1056" height="486" rx="24" fill="#ffffff" stroke="#d6e2d8" stroke-width="2"/>
    <image href="data:image/svg+xml;base64,${encodedIcon}" x="132" y="173" width="284" height="284"/>
    <text x="474" y="285" font-family="Noto Sans JP, Segoe UI, sans-serif" font-size="82" font-weight="700" fill="#183d27">Kotcya</text>
    <text x="478" y="356" font-family="Noto Sans JP, Segoe UI, sans-serif" font-size="34" fill="#50675a">画像を加工・解析し、来歴を確認</text>
    <path d="M478 399h518" stroke="#347e4c" stroke-width="8"/>
  </svg>
`);
await sharp(social).png().toFile(output('og.png'));
