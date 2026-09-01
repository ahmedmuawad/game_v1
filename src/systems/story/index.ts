import type { Chapter, SeasonMeta } from './types'
import { validateChapter } from './engine'

export * from './types'
export * from './conditions'
export * from './engine'

/**
 * تحميل محتوى القصة.
 *
 * الفصول تُحمَّل عند الطلب (lazy) من `public/story/` — الموسم كله ممكن
 * يكون عشرات الفصول، وتحميلها كلها مقدمًا بيكبّر الحزمة ويبطّئ الإقلاع.
 * ولأنها ملفات مستقلة، ممكن تُستبدل بمصدر بعيد بتغيير `STORY_BASE` وحده.
 */

const STORY_BASE = `${import.meta.env.BASE_URL}story/`

const seasons = new Map<string, SeasonMeta>()
const chapters = new Map<string, Chapter>()
const inflight = new Map<string, Promise<unknown>>()

type EmbeddedStory = Record<string, unknown>

/** نسخة الملف الواحد بتحقن ملفات القصة هنا بدل جلبها بالشبكة. */
function embedded<T>(key: string): T | null {
  const store = (globalThis as { __LIVI_STORY__?: EmbeddedStory }).__LIVI_STORY__
  return (store?.[key] as T) ?? null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadSeason(seasonId: string): Promise<SeasonMeta> {
  const cached = seasons.get(seasonId)
  if (cached) return cached
  const inline = embedded<SeasonMeta>(`${seasonId}/season.json`)
  if (inline) { seasons.set(seasonId, inline); return inline }
  const key = `season:${seasonId}`
  if (!inflight.has(key)) {
    inflight.set(key, fetchJson<SeasonMeta>(`${STORY_BASE}${seasonId}/season.json`)
      .then((s) => { seasons.set(seasonId, s); return s })
      .finally(() => inflight.delete(key)))
  }
  return inflight.get(key) as Promise<SeasonMeta>
}

export async function loadChapter(seasonId: string, chapterId: string): Promise<Chapter> {
  const cached = chapters.get(chapterId)
  if (cached) return cached
  const inline = embedded<Chapter>(`${seasonId}/${chapterId}.json`)
  if (inline) { chapters.set(chapterId, inline); return inline }
  const key = `chapter:${chapterId}`
  if (!inflight.has(key)) {
    inflight.set(key, fetchJson<Chapter>(`${STORY_BASE}${seasonId}/${chapterId}.json`)
      .then((c) => {
        if (import.meta.env.DEV) {
          const problems = validateChapter(c)
          if (problems.length) console.warn('[story] مشاكل في الفصل:\n' + problems.join('\n'))
        }
        chapters.set(chapterId, c)
        return c
      })
      .finally(() => inflight.delete(key)))
  }
  return inflight.get(key) as Promise<Chapter>
}

export function getSeason(id: string): SeasonMeta | undefined {
  return seasons.get(id)
}

export function getChapter(id: string): Chapter | undefined {
  return chapters.get(id)
}

/** يسخّن الفصل التالي أثناء قراءة الحالي — يمنع انتظارًا عند الانتقال. */
export function prefetchChapter(seasonId: string, chapterId: string): void {
  if (!chapters.has(chapterId)) void loadChapter(seasonId, chapterId).catch(() => {})
}
