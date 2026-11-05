// Erzeugt die Launcher-Icons der Android-App aus den Marken-SVGs in src/assets/brand.
// Aufruf: npm run icons – die Ergebnisse landen in android/app/src/main/res und werden eingecheckt.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const brand = new URL('../src/assets/brand/', import.meta.url)
const res = new URL('../android/app/src/main/res/', import.meta.url)

const appIcon = await readFile(new URL('takt-appicon-light.svg', brand))
const markSvg = (await readFile(new URL('takt-mark-light.svg', brand), 'utf8')).replace(
  /<\?xml.*?\?>/,
  '',
)
const placeMark = (size, offset) =>
  markSvg.replace(
    /width="512" height="512"/,
    `width="${size}" height="${size}" x="${offset}" y="${offset}"`,
  )

// Adaptive Icon: Vordergrund auf 108 dp, sichtbare Safe Zone 66 dp → Kopf auf ca. 50 %.
const foreground = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${placeMark(256, 128)}</svg>`,
)
// Rundes Legacy-Icon: weißer Kreis mit Kopf.
const round = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="256" fill="#FFFFFF"/>${placeMark(320, 96)}</svg>`,
)

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

const render = (svg, size, file) =>
  sharp(svg, { density: 300 })
    .resize(Math.round(size), Math.round(size))
    .png()
    .toFile(fileURLToPath(new URL(file, res)))

await Promise.all(
  Object.entries(densities).flatMap(([name, f]) => [
    render(appIcon, 48 * f, `mipmap-${name}/ic_launcher.png`),
    render(round, 48 * f, `mipmap-${name}/ic_launcher_round.png`),
    render(foreground, 108 * f, `mipmap-${name}/ic_launcher_foreground.png`),
  ]),
)
// Splash: Kopf mittig auf Markengrund, gleiche Maße wie die vorhandenen Dateien.
const splashes = [
  'drawable',
  ...['land', 'port'].flatMap((o) => Object.keys(densities).map((d) => `drawable-${o}-${d}`)),
].map((dir) => `${dir}/splash.png`)
for (const file of splashes) {
  const path = fileURLToPath(new URL(file, res))
  const { width, height } = await sharp(path).metadata()
  const size = Math.round(Math.min(width, height) * 0.28)
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#F7F1F5"/>${markSvg.replace(/width="512" height="512"/, `width="${size}" height="${size}" x="${(width - size) / 2}" y="${(height - size) / 2}"`)}</svg>`,
  )
  await sharp(await sharp(svg).png().toBuffer()).toFile(path)
}

console.log('Android-Icons erzeugt in android/app/src/main/res')
