import type { Chapter, Effect, StoryNode } from './types'
import { evaluate, type StoryContext } from './conditions'

/**
 * محرك تشغيل الفصل.
 *
 * نقي بالكامل: بياخد الفصل والسياق ويرجّع العقدة التالية والآثار المطلوب
 * تطبيقها. مفيش أي وصول للمخزن من هنا — فالمحرك قابل للاختبار بلا واجهة
 * ولا حالة عامة، والواجهة هي اللي بتطبّق الآثار.
 */

export interface Step {
  /** العقدة المعروضة (بعد تخطي عقد المنطق). */
  node: StoryNode
  /** آثار تراكمت أثناء المرور بعقد المنطق. */
  effects: Effect[]
  /** المسار المقطوع — للكشف عن الحلقات اللانهائية. */
  visited: string[]
}

const MAX_HOPS = 64

/** أنواع العقد اللي بتتعرض للاعبة (البقية منطق داخلي يُقفز فوقه). */
const VISIBLE = new Set(['say', 'narrate', 'choice', 'end'])

/**
 * يتقدّم من `nodeId` حتى أول عقدة مرئية، ويجمّع آثار العقد المنطقية.
 * يرجّع null لو المسار وصل لطريق مسدود.
 */
export function advance(
  chapter: Chapter,
  nodeId: string | null,
  ctx: StoryContext,
): Step | null {
  let id = nodeId ?? chapter.start
  const effects: Effect[] = []
  const visited: string[] = []

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const node: StoryNode | undefined = chapter.nodes[id]
    if (!node) {
      if (import.meta.env.DEV) console.warn(`[story] عقدة مفقودة: ${id}`)
      return null
    }
    visited.push(id)

    // شرط دخول العقدة
    if (node.when && !evaluate(node.when, ctx)) {
      if (!node.else) return null
      id = node.else
      continue
    }

    if (VISIBLE.has(node.type)) {
      return { node, effects, visited }
    }

    switch (node.type) {
      case 'effect':
        effects.push(...node.effects)
        if (!node.next) return null
        id = node.next
        break
      case 'branch': {
        const hit = node.branches.find((b) => evaluate(b.when, ctx))
        id = hit ? hit.to : node.fallback
        break
      }
      case 'stage':
        if (!node.next) return null
        id = node.next
        break
      default:
        return null
    }
  }

  if (import.meta.env.DEV) console.warn('[story] تجاوز حد القفزات — حلقة محتملة')
  return null
}

/** العقدة التالية بعد عقدة مرئية بلا اختيار. */
export function nextOf(node: StoryNode): string | null {
  if (node.type === 'say' || node.type === 'narrate') return node.next ?? null
  return null
}

/**
 * يجمع آخر توجيه مسرحي فعّال قبل العقدة الحالية.
 * الواجهة محتاجاه عشان تعرف الخلفية والمزاج ومين على المسرح.
 */
export function stageAt(chapter: Chapter, path: string[]): {
  bg?: string; mood?: string; cast: string[]
} {
  let bg: string | undefined
  let mood: string | undefined
  let cast: string[] = []
  for (const id of path) {
    const n = chapter.nodes[id]
    if (n?.type === 'stage') {
      if (n.bg) bg = n.bg
      if (n.mood) mood = n.mood
      if (n.cast) cast = n.cast
    }
  }
  return { bg, mood, cast }
}

/** تحقّق من سلامة الفصل — يُشغَّل في وضع التطوير وفي الاختبارات. */
export function validateChapter(chapter: Chapter): string[] {
  const problems: string[] = []
  const ids = new Set(Object.keys(chapter.nodes))
  const ref = (from: string, to: string | null | undefined) => {
    if (to && !ids.has(to)) problems.push(`${chapter.id}: ${from} → عقدة غير موجودة "${to}"`)
  }
  if (!ids.has(chapter.start)) problems.push(`${chapter.id}: عقدة البداية "${chapter.start}" غير موجودة`)

  const reached = new Set<string>()
  for (const [id, n] of Object.entries(chapter.nodes)) {
    ref(id, n.else)
    switch (n.type) {
      case 'say': case 'narrate': case 'stage': case 'effect':
        ref(id, n.next); if (n.next) reached.add(n.next); break
      case 'choice':
        if (n.options.length === 0) problems.push(`${chapter.id}: ${id} اختيار بلا خيارات`)
        n.options.forEach((o) => { ref(id, o.to); reached.add(o.to) })
        break
      case 'branch':
        n.branches.forEach((b) => { ref(id, b.to); reached.add(b.to) })
        ref(id, n.fallback); reached.add(n.fallback); break
      case 'end':
        break
    }
  }
  reached.add(chapter.start)
  for (const id of ids) {
    if (!reached.has(id)) problems.push(`${chapter.id}: عقدة غير قابلة للوصول "${id}"`)
  }
  const hasEnd = Object.values(chapter.nodes).some((n) => n.type === 'end')
  if (!hasEnd) problems.push(`${chapter.id}: مفيش عقدة نهاية`)
  return problems
}
