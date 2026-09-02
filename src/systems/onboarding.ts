import type { RoomConfig, StyleTag } from '@/state/types'

/**
 * منطق الدخول الأول — نقي بلا React ولا وصول للمخزن (قاعدة #3).
 *
 * **ليه الفايب بيدّي حاجة فورًا:** سؤال بلا أثر مرئي بيتقري كاستبيان
 * لا كاختيار. لما «بولد» تغيّر غرفتك وتديكِ قطعة على طول، اللاعبة
 * بتتعلّم من أول دقيقة إن اختياراتها في اللعبة دي ليها نتيجة — وده
 * بالظبط وعد المنتج (DECISIONS.md#D-003).
 *
 * **مش بنسأل عن السن هنا عن قصد.** بوابة العمر مكانها لحظة إنشاء
 * الحساب لا لحظة فتح اللعبة: طلب سنة ميلاد من طفلة قبل ما تشوف حاجة
 * هو جمع بيانات بلا سبب، واللعبة كلها شغّالة أوفلاين بلا حساب.
 * التفاصيل في systems/account/age.ts و DECISIONS.md#D-012.
 */

export type VibeId = 'soft' | 'bold' | 'dreamy'

export const VIBES: VibeId[] = ['soft', 'bold', 'dreamy']

/** الوسم اللي بندوّر بيه على هدية البداية لكل فايب. */
const VIBE_TAG: Record<VibeId, StyleTag> = {
  soft: 'soft',
  bold: 'bold',
  dreamy: 'dreamy',
}

/** الغرفة المبدئية لكل فايب — الاختيار لازم يبان فورًا. */
const VIBE_ROOM: Record<VibeId, Pick<RoomConfig, 'wall' | 'floor' | 'mood'>> = {
  soft:   { wall: 'wall_blush',  floor: 'floor_oak',   mood: 'day' },
  bold:   { wall: 'wall_ink',    floor: 'floor_walnut', mood: 'sunset' },
  dreamy: { wall: 'wall_lilac',  floor: 'floor_ash',   mood: 'night' },
}

export interface GiftCandidate {
  id: string
  category: string
  tags: readonly StyleTag[]
  rarity: string
  price: { currency: string; amount: number } | null
  level: number | null
}

export function roomForVibe(vibe: VibeId, base: RoomConfig): RoomConfig {
  return { ...base, ...VIBE_ROOM[vibe] }
}

/**
 * هدية البداية المطابقة للفايب.
 *
 * بنستبعد المملوك واللي ليه شرط مستوى: الهدية لازم تتلبس في نفس
 * اللحظة، وقطعة مقفولة كهدية ترحيب بتبقى وعد فاضي.
 *
 * الاختيار ثابت (أول مطابقة بعد ترتيب بالمعرّف) لا عشوائي: لاعبتان
 * اختارتا نفس الفايب لازم تلاقيا نفس الهدية، وإلا بقى الترحيب عشوائية
 * مدفوعة بشكل ما — وده ممنوع في المنتج ده.
 */
export function starterGiftFor(
  vibe: VibeId,
  candidates: readonly GiftCandidate[],
  owned: readonly string[],
): GiftCandidate | null {
  const tag = VIBE_TAG[vibe]
  const ownedSet = new Set(owned)
  const pool = candidates
    .filter((c) => !ownedSet.has(c.id) && c.level === null && c.tags.includes(tag))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  if (pool.length === 0) return null

  /*
    بنفضّل الفستان أو القطعة العلوية: دول اللي بيغيّروا شكل الإطلالة
    فورًا. حذاء كهدية ترحيب صح تقنيًا لكنه بالكاد يبان.
  */
  const preferred = pool.find((c) => c.category === 'dress')
    ?? pool.find((c) => c.category === 'top')
    ?? pool[0]
  return preferred
}

/** الاسم بعد التنظيف، أو null لو مش صالح. */
export function sanitizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 16) return null
  /*
    بنمنع المحارف اللي بتُستخدم للانتحال أو الحقن في العرض. مش فلترة
    ألفاظ — الاسم بيظهر للاعبة وحدها ومفيش شات في اللعبة (D-002)،
    فالخطر هنا تقني لا اجتماعي.
  */
  if (/[<>{}\\/@#$%^*_=|~`‎‏‪-‮]/.test(name)) return null
  return name
}
