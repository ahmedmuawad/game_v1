/**
 * تدقيق ملفات القصة بلا متصفح.
 *
 * `story:check` بيشغّل فصلًا واحدًا في متصفح حقيقي — تحقّق ممتاز لكنه
 * بطيء ومابيغطّيش غير المسار اللي بيمشي فيه. المدقّق ده بيقرا كل
 * الفصول ويتأكد من البنية كلها: كل إشارة لعقدة، كل شخصية متكلّمة، كل
 * نص بلغتين، وسلاسل الفصول. الغلطة في محتوى مكتوب بإيد بتحصل كتير،
 * وأرخص وقت لاكتشافها هو قبل ما التطبيق يشتغل.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'public/story'
const EMOTES = new Set(['neutral', 'smile', 'happy', 'sad', 'surprised', 'thinking'])
const MOODS = new Set(['day', 'sunset', 'night', 'warm', 'cool', 'tense'])
const SCENES = new Set(['school_gate', 'classroom', 'corridor', 'art_room', 'hall', 'yard', 'home'])

const problems = []
const warn = []

function checkText(where, t) {
  if (!t || typeof t !== 'object') { problems.push(`${where}: نص ناقص`); return }
  for (const lc of ['ar', 'en']) {
    if (!t[lc] || !String(t[lc]).trim()) problems.push(`${where}: نص ناقص للغة "${lc}"`)
  }
}

const seasonDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort()

if (seasonDirs.length === 0) problems.push('مفيش مواسم أصلًا')

for (const sid of seasonDirs) {
  const dir = join(ROOT, sid)
  const seasonPath = join(dir, 'season.json')
  if (!existsSync(seasonPath)) { problems.push(`${sid}: season.json مش موجود`); continue }

  const season = JSON.parse(readFileSync(seasonPath, 'utf8'))
  if (season.id !== sid) problems.push(`${sid}: معرّف الموسم جوّه الملف "${season.id}" مختلف عن اسم المجلد`)
  checkText(`${sid}/season.title`, season.title)
  checkText(`${sid}/season.teaser`, season.teaser)

  const chars = new Set(Object.keys(season.characters ?? {}))
  if (!chars.has('player')) problems.push(`${sid}: الموسم مفهوش شخصية "player"`)
  for (const [id, c] of Object.entries(season.characters ?? {})) {
    checkText(`${sid}/character:${id}`, c.name)
    if (!c.color) problems.push(`${sid}: شخصية "${id}" بلا لون`)
  }

  const listed = (season.chapters ?? []).map((c) => c.id)
  const chapterIds = new Set(listed)

  for (const [i, meta] of (season.chapters ?? []).entries()) {
    checkText(`${sid}/chapters[${i}].title`, meta.title)
    checkText(`${sid}/chapters[${i}].teaser`, meta.teaser)
    const file = join(dir, `${meta.id}.json`)
    if (!existsSync(file)) { problems.push(`${sid}: فصل مدرَج بلا ملف "${meta.id}.json"`); continue }

    const ch = JSON.parse(readFileSync(file, 'utf8'))
    const P = (m) => problems.push(`${meta.id}: ${m}`)

    if (ch.id !== meta.id) P(`المعرّف جوّه الملف "${ch.id}" مختلف عن المدرَج`)
    if (ch.seasonId !== sid) P(`seasonId "${ch.seasonId}" مختلف عن الموسم`)
    if (ch.index !== i + 1) P(`index=${ch.index} والمفروض ${i + 1}`)
    checkText(`${meta.id}.title`, ch.title)
    checkText(`${meta.id}.teaser`, ch.teaser)

    const nodes = ch.nodes ?? {}
    const ids = new Set(Object.keys(nodes))
    if (!ids.has(ch.start)) P(`عقدة البداية "${ch.start}" مش موجودة`)

    const ref = (from, to) => {
      if (to && !ids.has(to)) P(`${from} → عقدة مش موجودة "${to}"`)
    }
    const reached = new Set([ch.start])

    for (const [nid, n] of Object.entries(nodes)) {
      if (n.id && n.id !== nid) P(`العقدة "${nid}" جوّاها id="${n.id}"`)
      ref(nid, n.else)

      switch (n.type) {
        case 'say':
          if (!chars.has(n.who)) P(`${nid} بيتكلّم باسم شخصية مش معرَّفة "${n.who}"`)
          if (n.emote && !EMOTES.has(n.emote)) P(`${nid} تعبير غير معروف "${n.emote}"`)
          checkText(`${meta.id}:${nid}`, n.text)
          ref(nid, n.next); if (n.next) reached.add(n.next)
          break
        case 'narrate':
          checkText(`${meta.id}:${nid}`, n.text)
          ref(nid, n.next); if (n.next) reached.add(n.next)
          break
        case 'stage':
          if (n.bg && !SCENES.has(n.bg)) warn.push(`${meta.id}:${nid} مكان بلا خلفية مرسومة "${n.bg}"`)
          if (n.mood && !MOODS.has(n.mood)) P(`${nid} مزاج غير معروف "${n.mood}"`)
          for (const c of n.cast ?? []) if (!chars.has(c)) P(`${nid} على المسرح شخصية مش معرَّفة "${c}"`)
          ref(nid, n.next); if (n.next) reached.add(n.next)
          break
        case 'effect':
          ref(nid, n.next); if (n.next) reached.add(n.next)
          break
        case 'choice':
          if (!Array.isArray(n.options) || n.options.length === 0) P(`${nid} اختيار بلا خيارات`)
          if (n.prompt) checkText(`${meta.id}:${nid}.prompt`, n.prompt)
          for (const o of n.options ?? []) {
            checkText(`${meta.id}:${nid}/${o.id}`, o.text)
            ref(`${nid}/${o.id}`, o.to); reached.add(o.to)
            for (const e of o.effects ?? []) {
              if (e.rel && !chars.has(e.rel)) P(`${nid}/${o.id} أثر على علاقة بشخصية مش معرَّفة "${e.rel}"`)
            }
          }
          break
        case 'branch':
          for (const b of n.branches ?? []) { ref(nid, b.to); reached.add(b.to) }
          ref(nid, n.fallback); reached.add(n.fallback)
          break
        case 'end':
          if (n.nextChapter && !chapterIds.has(n.nextChapter)) {
            P(`النهاية بتشاور على فصل مش موجود "${n.nextChapter}"`)
          }
          if (n.teaser) checkText(`${meta.id}:${nid}.teaser`, n.teaser)
          break
        default:
          P(`${nid} نوع عقدة غير معروف "${n.type}"`)
      }
    }

    for (const nid of ids) if (!reached.has(nid)) P(`عقدة مش موصولة بحاجة "${nid}"`)
    const ends = Object.values(nodes).filter((n) => n.type === 'end')
    if (ends.length === 0) P('مفيش عقدة نهاية')

    // الفصل الأخير لازم يقفل الموسم لا يشاور على فصل مش موجود
    if (i === listed.length - 1) {
      for (const e of ends) {
        if (e.nextChapter) P(`آخر فصل في الموسم لازم nextChapter يبقى null`)
      }
    }
  }
}

for (const w of warn) console.log(`تنبيه: ${w}`)

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} مشكلة:\n`)
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

const total = seasonDirs.reduce((s, sid) => {
  const season = JSON.parse(readFileSync(join(ROOT, sid, 'season.json'), 'utf8'))
  return s + (season.chapters?.length ?? 0)
}, 0)
console.log(`✓ ${seasonDirs.length} موسم · ${total} فصل · كله سليم`)
