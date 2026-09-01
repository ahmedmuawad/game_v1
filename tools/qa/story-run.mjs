import { chromium } from 'playwright'

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))

await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.screenshot({ path: '/tmp/st_home.png' })

// ابدأ الفصل الأول
await p.click('.chapter-hero .btn')
await p.waitForTimeout(1800)
await p.screenshot({ path: '/tmp/st_scene.png' })

// اضغط خلال الحوار حتى يظهر أول اختيار
let sawChoice = false
for (let i = 0; i < 14; i++) {
  if (await p.$('.choices')) { sawChoice = true; break }
  const bubble = await p.$('.bubble')
  if (bubble) await bubble.click()
  await p.waitForTimeout(420)
}
await p.screenshot({ path: '/tmp/st_choice.png' })

// اختر أول خيار متاح ثم استمر حتى نهاية الفصل
if (sawChoice) {
  const opts = await p.$$('.choice:not(:disabled)')
  if (opts[0]) await opts[0].click()
  await p.waitForTimeout(600)
}
let ended = false
for (let i = 0; i < 60; i++) {
  if (await p.$('.chapter-end')) { ended = true; break }
  const ch = await p.$$('.choice:not(:disabled)')
  if (ch.length) { await ch[0].click(); await p.waitForTimeout(400); continue }
  const bubble = await p.$('.bubble')
  if (bubble) { await bubble.click(); await p.waitForTimeout(320); continue }
  break
}
await p.screenshot({ path: '/tmp/st_end.png' })

console.log(JSON.stringify({ sawChoice, reachedEnd: ended, errors: errs.slice(0, 6) }, null, 1))
await b.close()
