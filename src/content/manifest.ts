import type { Currency, Rarity, StyleTag } from '@/state/types'

/**
 * أصول الأفاتار المولّدة من خط الإنتاج ثلاثي الأبعاد.
 *
 * `public/avatar/manifest.json` هو المصدر الوحيد للحقيقة: بيتولّد من
 * `tools/avatar/wardrobe.py` مع الصور نفسها، فمستحيل يحصل انحراف بين
 * عنصر في اللعبة وصورته. اللعبة بتقراه وقت التشغيل بدل ما نولّد كود —
 * فإضافة قطعة جديدة متطلبتش بناء جديد للتطبيق.
 */

export interface LayerName {
  ar: string
  en: string
}

export interface BodyLayer {
  src: string
  skin: string
  eyes: string
  name: LayerName
}

export interface HairLayer {
  back: string
  front: string
  style: string
  color: string
  name: LayerName
}

export interface GarmentLayer {
  src: string
  category: 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'
  rarity: Rarity
  tags: StyleTag[]
  starter: boolean
  level: number | null
  price: { currency: Currency; amount: number } | null
  name: LayerName
}

export interface AvatarView {
  size: [number, number]
  body: Record<string, BodyLayer>
  hair: Record<string, HairLayer>
  garments: Record<string, GarmentLayer>
}

export interface AvatarManifest {
  views: Record<string, AvatarView>
  /** بورتريهات طاقم القصة: character → expression → مسار الصورة. */
  cast?: Record<string, Record<string, string>>
  layerOrder: Record<string, number>
  skinTones: Record<string, { name: LayerName }>
  eyeColors: Record<string, { name: LayerName }>
  hairStyles: Record<string, { name: LayerName }>
  hairColors: Record<string, { name: LayerName }>
  generatedAt: number
}

const BASE = `${import.meta.env.BASE_URL}avatar/`

let cache: AvatarManifest | null = null
let pending: Promise<AvatarManifest> | null = null

/**
 * في نسخة «الملف الواحد» (للمعاينة والمشاركة) بتتحقن الأصول كـ data URIs
 * في `__LIVI_ASSETS__`. البناء العادي بيتجاهل ده تمامًا.
 */
interface EmbeddedAssets { [path: string]: string }

export function assetUrl(src: string): string {
  const embedded = (globalThis as { __LIVI_ASSETS__?: EmbeddedAssets }).__LIVI_ASSETS__
  return embedded?.[src] ?? BASE + src
}

export async function loadManifest(): Promise<AvatarManifest> {
  if (cache) return cache
  const embedded = (globalThis as { __LIVI_MANIFEST__?: AvatarManifest }).__LIVI_MANIFEST__
  if (embedded) { cache = embedded; return embedded }
  if (!pending) {
    pending = fetch(`${BASE}manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`)
        return r.json() as Promise<AvatarManifest>
      })
      .then((m) => {
        cache = m
        return m
      })
      .catch((err) => {
        pending = null
        throw err
      })
  }
  return pending
}

/** يُستخدم بعد التحميل فقط؛ يرجّع null قبله. */
export function getManifest(): AvatarManifest | null {
  return cache
}

// ---- مساعدات الاستعلام ----

export function viewOf(m: AvatarManifest, view = 'full'): AvatarView | null {
  return m.views[view] ?? m.views[Object.keys(m.views)[0]] ?? null
}

export function bodyKey(skin: string, eyes: string): string {
  return `${skin}_${eyes}`
}

export function hairKey(style: string, color: string): string {
  return `${style}_${color}`
}

/** كل القطع في فئة، مرتبة: العناصر الابتدائية أولًا ثم حسب الندرة. */
const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, rare: 1, epic: 2, legendary: 3,
}

export function garmentsByCategory(
  v: AvatarView,
  category: GarmentLayer['category'],
): (GarmentLayer & { id: string })[] {
  return Object.entries(v.garments)
    .filter(([, g]) => g.category === category)
    .map(([id, g]) => ({ ...g, id }))
    .sort((a, b) =>
      Number(b.starter) - Number(a.starter) ||
      RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
      (a.level ?? 0) - (b.level ?? 0))
}

export function garment(v: AvatarView, id: string): GarmentLayer | undefined {
  return v.garments[id]
}

/** بورتريه شخصية بتعبير معيّن، مع رجوع للتعبير المحايد. */
export function castPortrait(
  m: AvatarManifest | null,
  character: string,
  emote = 'neutral',
): string | null {
  const set = m?.cast?.[character]
  if (!set) return null
  return set[emote] ?? set.neutral ?? Object.values(set)[0] ?? null
}

/** أوسمة الأسلوب للإطلالة الحالية — يستخدمها محرك القصص. */
export function outfitTags(v: AvatarView, worn: Record<string, string | undefined>): Set<StyleTag> {
  const out = new Set<StyleTag>()
  for (const id of Object.values(worn)) {
    if (!id) continue
    v.garments[id]?.tags.forEach((t) => out.add(t))
  }
  return out
}

/** أعلى ندرة مرتداة — تعلّق عليها شخصيات القصة. */
export function topRarity(v: AvatarView, worn: Record<string, string | undefined>): Rarity {
  const order: Rarity[] = ['common', 'rare', 'epic', 'legendary']
  let best = 0
  for (const id of Object.values(worn)) {
    if (!id) continue
    const g = v.garments[id]
    if (g) best = Math.max(best, order.indexOf(g.rarity))
  }
  return order[best]
}
