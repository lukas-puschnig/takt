// Erzeugt die PWA-Icons (PNG) aus den Marken-SVGs in src/assets/brand.
// Aufruf: npm run icons – die Ergebnisse landen in public/icons und werden eingecheckt.
import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const brand = new URL('../src/assets/brand/', import.meta.url)
const out = new URL('../public/icons/', import.meta.url)
await mkdir(out, { recursive: true })

const appIcon = await readFile(new URL('takt-appicon-light.svg', brand))
const mark = (await readFile(new URL('takt-mark-light.svg', brand), 'utf8'))
  .replace(/<\?xml.*?\?>/, '')
  .replace(/width="512" height="512"/, 'width="307" height="307" x="102.5" y="102.5"')

// Maskable: Kopf auf ca. 60 % der Fläche, vollflächiger Grund (Safe Zone).
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#FFFFFF"/>${mark}</svg>`,
)

const render = (svg, size, file) =>
  sharp(svg, { density: 300 }).resize(size, size).png().toFile(new URL(file, out).pathname)

await Promise.all([
  render(appIcon, 192, 'pwa-192.png'),
  render(appIcon, 512, 'pwa-512.png'),
  render(maskable, 512, 'maskable-512.png'),
  render(maskable, 180, 'apple-touch-icon-180.png'),
])
console.log('Icons erzeugt in public/icons')
