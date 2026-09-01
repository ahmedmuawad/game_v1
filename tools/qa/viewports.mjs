import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

const body = await readFile('dist-single/livi.html', 'utf8')
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${body}</body></html>`

const SIZES = [
  ['desktop-wide', 1440, 900],
  ['desktop-narrow', 1024, 700],
  ['tablet', 768, 1024],
  ['phone-large', 430, 932],
  ['phone-small', 360, 640],
  ['short', 900, 500],
]

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const report = []
for (const [name, w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []
  p.on('pageerror', e => errs.push(e.message.slice(0, 80)))
  await p.setContent(page, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  await p.screenshot({ path: `/tmp/vp_${name}.png` })
  const m = await p.evaluate(() => {
    const app = document.querySelector('.app')
    const nav = document.querySelector('.navbar')
    const hero = document.querySelector('.chapter-hero')
    const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y),
                             w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null
    return {
      app: r(app), nav: r(nav), hero: r(hero),
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth,
      navVisible: nav ? nav.getBoundingClientRect().bottom <= window.innerHeight + 1 : false,
    }
  })
  report.push({ name, size: `${w}x${h}`, ...m, errs })
  await p.close()
}
console.log(JSON.stringify(report, null, 1))
await b.close()
