/**
 * يبني نسخة «ملف واحد» من اللعبة للمعاينة والمشاركة.
 *
 * يضمّن الكود والتنسيقات وكل الصور (data URIs) وملفات القصة داخل ملف
 * HTML واحد، فتشتغل من غير خادم. مخصّصة للمراجعة فقط — البناء الإنتاجي
 * بيفضل يحمّل الأصول من الشبكة عشان التخزين المؤقت وحجم الحزمة.
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const DIST = join(ROOT, 'dist')
const PUBLIC = join(ROOT, 'public')

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

async function walk(dir, base = dir, out = []) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name)
    const s = await stat(p)
    if (s.isDirectory()) await walk(p, base, out)
    else out.push({ abs: p, rel: relative(base, p).split('\\').join('/') })
  }
  return out
}

async function findAsset(dir, ext) {
  const files = await readdir(join(DIST, dir))
  const hit = files.find((f) => f.endsWith(ext))
  if (!hit) throw new Error(`لم يُعثر على ${ext} في dist/${dir}`)
  return readFile(join(DIST, dir, hit), 'utf8')
}

// ---- الكود والتنسيقات ----
let css = await findAsset('assets', '.css')
const js = await findAsset('assets', '.js')

// خطوط Google لازم تبقى <link> لا @import: سياسة أمان الصفحة بترفض
// الاستيراد داخل style مضمّن، فالخط بيسقط بصمت للخط الافتراضي.
const fontLinks = []
css = css.replace(/@import\s+url\((['"]?)(https:\/\/fonts\.googleapis\.com[^'")]+)\1\);?/g, (_, __, url) => {
  fontLinks.push(`<link rel="stylesheet" href="${url}">`)
  return ''
})

// ---- الصور ----
const avatarFiles = (await walk(join(PUBLIC, 'avatar'))).filter((f) => MIME[extname(f.abs)])
const assets = {}
let bytes = 0
for (const f of avatarFiles) {
  const buf = await readFile(f.abs)
  bytes += buf.length
  assets[f.rel] = `data:${MIME[extname(f.abs)]};base64,${buf.toString('base64')}`
}

// ---- المانيفست والقصة ----
const manifest = JSON.parse(await readFile(join(PUBLIC, 'avatar/manifest.json'), 'utf8'))
const storyFiles = await walk(join(PUBLIC, 'story'))
const story = {}
for (const f of storyFiles) {
  if (extname(f.abs) === '.json') story[f.rel] = JSON.parse(await readFile(f.abs, 'utf8'))
}

const html = `<title>ليڤي — معاينة</title>
${fontLinks.join('\n')}
<style>
html,body{margin:0;height:100%;background:#0D0912;overflow:hidden}
#root{height:100%}
${css}
</style>
<div id="root"></div>
<script>
window.__LIVI_ASSETS__ = ${JSON.stringify(assets)};
window.__LIVI_MANIFEST__ = ${JSON.stringify(manifest)};
window.__LIVI_STORY__ = ${JSON.stringify(story)};
</script>
<script type="module">
${js}
</script>
`

const out = join(ROOT, 'dist-single', 'livi.html')
await writeFile(out, html, 'utf8')
const kb = (n) => (n / 1024).toFixed(0)
console.log(`ملف واحد: ${out}`)
console.log(`  صور: ${avatarFiles.length} ملف · ${kb(bytes)} KB خام`)
console.log(`  قصة: ${Object.keys(story).length} ملف`)
console.log(`  الحجم النهائي: ${kb(Buffer.byteLength(html))} KB`)
