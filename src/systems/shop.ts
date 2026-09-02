import type { Rarity } from '@/state/types'

/**
 * منطق المتجر — نقي بلا React ولا وصول للمخزن (قاعدة #3).
 *
 * **قرار منتج مقصود: مفيش ضغط ندرة.**
 * مفيش عدّادات تنازلية ولا «فاضل قطعتين» ولا عروض بتنتهي. الجمهور كله
 * قاصرون، وخلق إلحاح صناعي عشان يستعجلوا الشرا نمط مظلم صريح. اللي
 * بنعمله هنا **ترشيح** لا ضغط: مجموعة مختارة بتتغيّر كل يوم عشان
 * الواجهة تفضل حيّة، من غير ما تخوّف حد إنه هيفوّت حاجة.
 * (نفس منطق DECISIONS.md#D-002)
 */

export interface ShopEntry {
  id: string
  category: string
  rarity: Rarity
  price: { currency: 'coins' | 'gems'; amount: number }
  level: number | null
}

/** مولّد أرقام شبه عشوائي ثابت — نفس البذرة تدّي نفس الترتيب دايمًا. */
function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * اختيار اليوم من المتجر.
 *
 * بنستبعد المملوك والمقفول بالمستوى: عرض حاجة مقفولة كـ«اختيار اليوم»
 * بيحوّل الترشيح لإحباط. ولو اللي فاضل أقل من المطلوب بنرجّع اللي فيه
 * بدل ما نكمّل بحاجة مقفولة.
 */
export function pickDailyShop(
  pool: ShopEntry[],
  owned: readonly string[],
  level: number,
  dayKey: string,
  count = 3,
): ShopEntry[] {
  const ownedSet = new Set(owned)
  const eligible = pool.filter(
    (e) => !ownedSet.has(e.id) && (e.level === null || level >= e.level),
  )
  if (eligible.length <= count) return eligible

  // ترتيب ثابت قبل الخلط: ترتيب الكائن في JS مش مضمون عبر المصادر
  const sorted = [...eligible].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const rand = seededRandom(dayKey)

  // خلط فيشر-ييتس ببذرة اليوم
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  }
  return sorted.slice(0, count)
}

/** هل تقدر تشتريها دلوقتي؟ يفرّق بين «مش معاكِ فلوس» و«مستواكِ أقل». */
export type Affordability = 'ok' | 'poor' | 'locked' | 'owned'

export function affordability(
  entry: ShopEntry,
  owned: readonly string[],
  level: number,
  coins: number,
  gems: number,
): Affordability {
  if (owned.includes(entry.id)) return 'owned'
  if (entry.level !== null && level < entry.level) return 'locked'
  const purse = entry.price.currency === 'gems' ? gems : coins
  return purse >= entry.price.amount ? 'ok' : 'poor'
}
