import { getConfig, type GameConfig } from '@/systems/config'

/**
 * بوابة العمر — منطق نقي بلا React ولا وصول للمخزن (قاعدة #3).
 *
 * الجمهور كله قاصرون (DECISIONS.md#D-002)، والحساب انضاف بقرار صريح
 * في D-012. البوابة دي هي اللي بتحدد إذا كان الحساب مسموح أصلًا ولا
 * محتاج موافقة والدية موثّقة الأول.
 *
 * **مبدأ حاكم: تاريخ الميلاد ما بيتخزّنش أبدًا.** بندخّله، نشتقّ منه
 * الفئة، ونرمي الأصل. تخزين تاريخ ميلاد قاصر بيحوّل البيانات لفئة
 * أشد حساسية بلا أي مكسب — إحنا محتاجين الفئة بس.
 */

/** الفئة العمرية المشتقّة — دي اللي بتتخزّن، مش السن ولا تاريخ الميلاد. */
export type AgeBracket = 'child' | 'teen'

/** حالة الموافقة الوالدية. */
export type ConsentState = 'not_required' | 'pending' | 'granted'

export interface AgeGateResult {
  /** الفئة المشتقّة، أو `null` لو الإدخال غير صالح. */
  bracket: AgeBracket | null
  /** هل الإدخال مقبول أصلًا؟ */
  valid: boolean
  /** هل لازم موافقة والدية قبل أي حساب أو رفع بيانات؟ */
  needsParentalConsent: boolean
}

/**
 * السن التقريبي من سنة الميلاد.
 *
 * بنسأل عن السنة بس لا اليوم والشهر: ده أقل قدر بيانات يكفي للقرار،
 * وطلب تاريخ كامل من طفلة بيجمع بيانات مالهاش لازمة. النتيجة ممكن
 * تقلّ سنة عن الحقيقة، وبنتعامل مع ده بالتحفّظ في `bracketForAge`.
 */
export function approxAgeFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear
}

/** هل سنة الميلاد معقولة أصلًا؟ حارس ضد الإدخال الغلط لا أكتر. */
export function isPlausibleBirthYear(
  birthYear: number,
  now: Date = new Date(),
  cfg: GameConfig = getConfig(),
): boolean {
  if (!Number.isInteger(birthYear)) return false
  const age = approxAgeFromBirthYear(birthYear, now)
  return age >= 0 && age <= cfg.ageMaxPlausible
}

/**
 * الفئة من السن التقريبي.
 *
 * بنميل للتحفّظ عن قصد: لأن السن مشتقّ من السنة بس فهو ممكن يكون
 * أكبر بسنة من الحقيقي (لو عيد الميلاد ماجاش لسه). فاللي سنه يساوي
 * الحدّ بالظبط بنعتبره `child` — أسوأ نتيجة إننا نطلب موافقة والدية
 * من طفلة عندها 13 فعلًا، وهي أهون بكتير من جمع بيانات طفلة عندها 12.
 */
export function bracketForAge(age: number, cfg: GameConfig = getConfig()): AgeBracket {
  return age <= cfg.consentAgeMin ? 'child' : 'teen'
}

/** تشغيل البوابة على سنة ميلاد مدخَلة. */
export function runAgeGate(
  birthYear: number,
  now: Date = new Date(),
  cfg: GameConfig = getConfig(),
): AgeGateResult {
  if (!isPlausibleBirthYear(birthYear, now, cfg)) {
    return { bracket: null, valid: false, needsParentalConsent: true }
  }
  const bracket = bracketForAge(approxAgeFromBirthYear(birthYear, now), cfg)
  return {
    bracket,
    valid: true,
    needsParentalConsent: bracket === 'child',
  }
}

/** الموافقة المطلوبة ابتداءً لكل فئة. */
export function initialConsentFor(bracket: AgeBracket): ConsentState {
  return bracket === 'child' ? 'pending' : 'not_required'
}

/**
 * هل مسموح بتسجيل الدخول ورفع أي بيانات؟
 *
 * البوابة **مغلقة افتراضيًا**: أي حالة مش معروفة بتتقري كمنع. ولاحظ إن
 * `child` مايقدرش يسجّل دخول بجوجل أصلًا حتى بعد الموافقة — جوجل
 * مابتديش حسابات عادية تحت 13 (بتبقى مُدارة بـFamily Link)، فالمسار
 * بتاعه بيمرّ ببريد ولي الأمر.
 */
export function mayCreateAccount(
  bracket: AgeBracket | null,
  consent: ConsentState | null,
): boolean {
  if (bracket === 'teen') return true
  if (bracket === 'child') return consent === 'granted'
  return false
}

/**
 * هل مسموح برفع بيانات اللعب للسحابة؟
 *
 * نفس شرط إنشاء الحساب — بنفصلها في دالة مستقلة عشان أي تخفيف
 * مستقبلي على أحدهما ما يسرّبش على التاني بالسهو.
 */
export function maySyncData(
  bracket: AgeBracket | null,
  consent: ConsentState | null,
): boolean {
  return mayCreateAccount(bracket, consent)
}
