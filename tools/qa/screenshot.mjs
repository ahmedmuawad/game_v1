import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
await p.screenshot({ path: '/tmp/app_1.png' })
// بدّل لفستان
const tabs = await p.$$('.tab')
if (tabs[2]) { await tabs[2].click(); await p.waitForTimeout(600) }
const tiles = await p.$$('.style__grid .tile')
if (tiles[0]) { await tiles[0].click(); await p.waitForTimeout(1200) }
await p.screenshot({ path: '/tmp/app_2.png' })
console.log('errors:', errs.length ? errs.slice(0,5) : 'none')
await b.close()
