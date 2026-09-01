import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { advance, evaluate, validateChapter } from '..'
import type { Chapter, StoryContext } from '..'

const STORY_DIR = join(process.cwd(), 'public/story/s1')

function ctx(patch: Partial<StoryContext> = {}): StoryContext {
  return {
    traits: { confidence: 10, creativity: 10, empathy: 10, wits: 10 },
    relationships: {},
    flags: {},
    owned: [],
    level: 1,
    completedChapters: [],
    outfitTags: new Set<string>(),
    outfitRarity: 'common',
    ...patch,
  }
}

// ============================================================
// مُفسِّر الشروط
// ============================================================

describe('مُفسِّر الشروط', () => {
  it('شرط غائب يعني «مسموح»', () => {
    expect(evaluate(undefined, ctx())).toBe(true)
  })

  it('يقارن السمات', () => {
    const c = ctx({ traits: { confidence: 20, creativity: 0, empathy: 0, wits: 0 } })
    expect(evaluate({ trait: 'confidence', op: '>=', value: 20 }, c)).toBe(true)
    expect(evaluate({ trait: 'confidence', op: '>', value: 20 }, c)).toBe(false)
  })

  it('العلاقة الافتراضية 50 عند عدم وجودها', () => {
    expect(evaluate({ rel: 'salma', op: '=', value: 50 }, ctx())).toBe(true)
  })

  it('العلم بلا op يعني «صادق»', () => {
    expect(evaluate({ flag: 'x' }, ctx({ flags: { x: true } }))).toBe(true)
    expect(evaluate({ flag: 'x' }, ctx({ flags: { x: false } }))).toBe(false)
    expect(evaluate({ flag: 'x' }, ctx())).toBe(false)
  })

  it('يستعلم عن أوسمة الإطلالة — الجسر بين التخصيص والسرد', () => {
    const c = ctx({ outfitTags: new Set(['formal', 'bold']) })
    expect(evaluate({ wearing: 'formal' }, c)).toBe(true)
    expect(evaluate({ wearing: 'cozy' }, c)).toBe(false)
  })

  it('يقارن ندرة الإطلالة بترتيبها لا نصّها', () => {
    const c = ctx({ outfitRarity: 'epic' })
    expect(evaluate({ wearingRarity: '>=', value: 'rare' }, c)).toBe(true)
    expect(evaluate({ wearingRarity: '>=', value: 'legendary' }, c)).toBe(false)
  })

  it('يركّب all / any / not', () => {
    const c = ctx({ traits: { confidence: 30, creativity: 0, empathy: 5, wits: 0 } })
    expect(evaluate({ all: [
      { trait: 'confidence', op: '>=', value: 20 },
      { not: { trait: 'empathy', op: '>=', value: 20 } },
    ] }, c)).toBe(true)
    expect(evaluate({ any: [
      { trait: 'empathy', op: '>=', value: 99 },
      { trait: 'confidence', op: '>=', value: 20 },
    ] }, c)).toBe(true)
  })

  it('مفتاح غير معروف يرجّع false لا يرمي', () => {
    // @ts-expect-error اختبار متعمّد لمدخل غير صالح
    expect(evaluate({ nonsense: 1 }, ctx())).toBe(false)
  })
})

// ============================================================
// المحرك
// ============================================================

const chapter: Chapter = {
  id: 't1', seasonId: 's', index: 1,
  title: { ar: 'ت', en: 't' }, teaser: { ar: 'ت', en: 't' },
  start: 'a',
  nodes: {
    a: { id: 'a', type: 'stage', mood: 'night', cast: ['player', 'x'], next: 'b' },
    b: { id: 'b', type: 'effect', effects: [{ trait: 'wits', delta: 3 }], next: 'c' },
    c: { id: 'c', type: 'branch',
         branches: [{ when: { flag: 'go' }, to: 'd' }], fallback: 'e' },
    d: { id: 'd', type: 'say', who: 'x', text: { ar: 'د', en: 'd' }, next: 'e' },
    e: { id: 'e', type: 'end', reward: { coins: 10 }, nextChapter: null },
    loopA: { id: 'loopA', type: 'stage', next: 'loopB' },
    loopB: { id: 'loopB', type: 'stage', next: 'loopA' },
  },
}

describe('محرك القصص', () => {
  it('يقفز فوق العقد المنطقية حتى أول عقدة مرئية', () => {
    const s = advance(chapter, null, ctx())
    expect(s?.node.id).toBe('e')          // stage → effect → branch → end
  })

  it('يجمّع آثار العقد التي مرّ بها', () => {
    const s = advance(chapter, null, ctx())
    expect(s?.effects).toEqual([{ trait: 'wits', delta: 3 }])
  })

  it('التفرّع يتبع الشرط', () => {
    const s = advance(chapter, null, ctx({ flags: { go: true } }))
    expect(s?.node.id).toBe('d')
  })

  it('يسجّل المسار ليعرف التوجيه المسرحي الفعّال', () => {
    const s = advance(chapter, null, ctx())
    expect(s?.visited).toContain('a')
  })

  it('يرجّع null لعقدة غير موجودة', () => {
    expect(advance(chapter, 'ghost', ctx())).toBeNull()
  })

  it('يكسر الحلقات اللانهائية بدل التعليق', () => {
    expect(advance(chapter, 'loopA', ctx())).toBeNull()
  })
})

// ============================================================
// سلامة المحتوى — يفشل البناء لو انكسر أي فصل
// ============================================================

describe('محتوى الموسم الأول', () => {
  const files = readdirSync(STORY_DIR).filter((f) => /^s1_c\d+\.json$/.test(f))

  it('يحتوي ستة فصول', () => {
    expect(files).toHaveLength(6)
  })

  it.each(files)('%s سليم بنيويًا', (file) => {
    const ch = JSON.parse(readFileSync(join(STORY_DIR, file), 'utf8')) as Chapter
    expect(validateChapter(ch)).toEqual([])
  })

  it.each(files)('%s كل النصوص مترجمة للغتين', (file) => {
    const ch = JSON.parse(readFileSync(join(STORY_DIR, file), 'utf8')) as Chapter
    const missing: string[] = []
    const check = (path: string, t: unknown) => {
      const o = t as { ar?: string; en?: string }
      if (!o?.ar?.trim() || !o?.en?.trim()) missing.push(path)
    }
    for (const [id, n] of Object.entries(ch.nodes)) {
      if (n.type === 'say' || n.type === 'narrate') check(`${id}.text`, n.text)
      if (n.type === 'choice') {
        n.options.forEach((o, i) => check(`${id}.options[${i}]`, o.text))
        if (n.prompt) check(`${id}.prompt`, n.prompt)
      }
      if (n.type === 'end' && n.teaser) check(`${id}.teaser`, n.teaser)
    }
    expect(missing).toEqual([])
  })

  it('الفصول متسلسلة بلا انقطاع', () => {
    const links = new Map<string, string | null>()
    for (const f of files) {
      const ch = JSON.parse(readFileSync(join(STORY_DIR, f), 'utf8')) as Chapter
      const end = Object.values(ch.nodes).find((n) => n.type === 'end')
      links.set(ch.id, end && end.type === 'end' ? (end.nextChapter ?? null) : null)
    }
    expect(links.get('s1_c1')).toBe('s1_c2')
    expect(links.get('s1_c5')).toBe('s1_c6')
    expect(links.get('s1_c6')).toBeNull()   // نهاية الموسم
  })

  it('كل خيار مقفول يشرح سبب قفله', () => {
    for (const f of files) {
      const ch = JSON.parse(readFileSync(join(STORY_DIR, f), 'utf8')) as Chapter
      for (const n of Object.values(ch.nodes)) {
        if (n.type !== 'choice') continue
        for (const o of n.options) {
          if (o.when) expect(o.lockedHint, `${ch.id}/${o.id}`).toBeDefined()
        }
      }
    }
  })
})
