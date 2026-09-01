import type { Rarity } from '@/state/types'
import type { CompareOp, Condition } from './types'

/**
 * مُفسِّر الشروط.
 *
 * مُقيَّد عمدًا: لا `eval` ولا `new Function`. المحتوى مصمَّم ليُحمَّل عن
 * بُعد، ولو كان تنفيذ الشروط بتقييم نصوص لبقى أي ملف فصل قناة تنفيذ كود.
 * الشروط هنا بنية بيانات مغلقة، وأي مفتاح غير معروف بيرجّع false.
 */

export interface StoryContext {
  traits: Record<string, number>
  relationships: Record<string, number>
  flags: Record<string, boolean | number | string>
  owned: string[]
  level: number
  completedChapters: string[]
  /** أوسمة الأسلوب للإطلالة الحالية. */
  outfitTags: Set<string>
  /** أعلى ندرة مرتداة. */
  outfitRarity: Rarity
}

const RARITY_RANK: Record<Rarity, number> = {
  common: 0, rare: 1, epic: 2, legendary: 3,
}

function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case '=':  return a === b
    case '!=': return a !== b
    case '>':  return a > b
    case '>=': return a >= b
    case '<':  return a < b
    case '<=': return a <= b
    default:   return false
  }
}

export function evaluate(cond: Condition | undefined, ctx: StoryContext): boolean {
  if (!cond) return true

  if ('all' in cond) return cond.all.every((c) => evaluate(c, ctx))
  if ('any' in cond) return cond.any.some((c) => evaluate(c, ctx))
  if ('not' in cond) return !evaluate(cond.not, ctx)

  if ('trait' in cond) {
    return compare(ctx.traits[cond.trait] ?? 0, cond.op, cond.value)
  }
  if ('rel' in cond) {
    return compare(ctx.relationships[cond.rel] ?? 50, cond.op, cond.value)
  }
  if ('flag' in cond) {
    const v = ctx.flags[cond.flag]
    if (cond.op === undefined) return Boolean(v)
    if (typeof v === 'number' && typeof cond.value === 'number') {
      return compare(v, cond.op, cond.value)
    }
    return cond.op === '=' ? v === cond.value : v !== cond.value
  }
  if ('has' in cond) return ctx.owned.includes(cond.has)
  if ('wearing' in cond) return ctx.outfitTags.has(cond.wearing)
  if ('wearingRarity' in cond) {
    return compare(RARITY_RANK[ctx.outfitRarity], cond.wearingRarity,
                   RARITY_RANK[cond.value])
  }
  if ('level' in cond) return compare(ctx.level, cond.level, cond.value)
  if ('chapterDone' in cond) return ctx.completedChapters.includes(cond.chapterDone)

  return false
}

/** يشرح شرطًا غير محقق للاعبة بلا كشف بنية البيانات. */
export function describeGate(cond: Condition | undefined): 'trait' | 'outfit' | 'relationship' | 'item' | 'level' | null {
  if (!cond) return null
  if ('all' in cond) return cond.all.map(describeGate).find(Boolean) ?? null
  if ('any' in cond) return cond.any.map(describeGate).find(Boolean) ?? null
  if ('not' in cond) return describeGate(cond.not)
  if ('trait' in cond) return 'trait'
  if ('wearing' in cond || 'wearingRarity' in cond) return 'outfit'
  if ('rel' in cond) return 'relationship'
  if ('has' in cond) return 'item'
  if ('level' in cond) return 'level'
  return null
}
