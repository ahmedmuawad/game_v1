import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 120)))
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)

// افتح تبويب الستايل
const nav = await p.$$('.navbtn')
await nav[2].click()
await p.waitForTimeout(1200)
await p.screenshot({ path: '/tmp/w_top.png' })

const counts = {}
const tabs = await p.$$('.tab')
for (let i = 0; i < tabs.length; i++) {
  const t = (await p.$$('.tab'))[i]
  const label = (await t.textContent()).trim()
  await t.click()
  await p.waitForTimeout(500)
  counts[label] = (await p.$$('.style__grid .tile')).length
  if (label.includes('الشعر')) {
    counts['عيّنات ألوان'] = (await p.$$('.swatch')).length
    await p.screenshot({ path: '/tmp/w_hair.png' })
  }
  if (label.includes('البشرة') || label.includes('skin')) {
    await p.screenshot({ path: '/tmp/w_skin.png' })
  }
}
console.log(JSON.stringify({ counts, errors: errs.slice(0, 5) }, null, 1))
await b.close()
