/**
 * طبقة الإعداد عن بُعد (Remote Config).
 *
 * كل قيمة تؤثر على التوازن أو الاقتصاد أو وتيرة اللعب تعيش هنا — وليس مبعثرة في الكود.
 * في V1 القيم محلية؛ `hydrateConfig()` جاهزة لاستقبال قيم من الخادم لاحقًا
 * دون الحاجة لتحديث التطبيق في المتجر (انظر PRODUCT_BLUEPRINT §24).
 */

export interface GameConfig {
  // ---- الطاقة ----
  /** الحد الأقصى للطاقة عند المستوى 1. */
  energyMax: number
  /** طاقة إضافية لكل N مستويات. */
  energyMaxPerLevels: number
  /** دقائق لتجديد وحدة طاقة واحدة. */
  energyRegenMinutes: number
  /** تكلفة الطاقة لفصل قصة واحد. */
  energyPerChapter: number

  // ---- الاقتصاد ----
  coinsPerChapter: number
  xpPerChapter: number
  minigameBaseCoins: number
  minigameMaxCoins: number
  dailyGiftCoins: number[]
  /** مكافأة المستوى: جيمز عند كل ترقٍّ. */
  gemsPerLevelUp: number

  // ---- التقدّم ----
  /** XP المطلوب للمستوى n = baseXp * n^xpCurve */
  xpBase: number
  xpCurve: number
  maxLevel: number

  // ---- الحلقة اليومية ----
  dailyMissionCount: number
  /** ساعات حتى يفتح الفصل التالي بعد إكمال فصل. */
  chapterCooldownHours: number
  /** تُقسَّم السلسلة على هذا الرقم عند الانقطاع بدل التصفير (DECISIONS.md#D-008). */
  streakBreakDivisor: number

  // ---- الإعلانات ----
  /** أقصى عدد إعلانات مكافِئة يوميًا — سقف صارم لحماية التجربة. */
  adsPerDayMax: number
  /** ثوانٍ بين إعلانين. */
  adCooldownSeconds: number
  adRewardEnergy: number
  adRewardCoinMultiplier: number

  // ---- أعلام الميزات ----
  features: {
    minigames: boolean
    /** شاشة الغرفة — تفرّق عن `roomSnapshot` اللي هو مشاركة لقطة الغرفة. */
    room: boolean
    shop: boolean
    styleChallenge: boolean
    roomSnapshot: boolean
    ads: boolean
    subscription: boolean
  }
}

export const DEFAULT_CONFIG: GameConfig = {
  energyMax: 5,
  energyMaxPerLevels: 5,
  energyRegenMinutes: 24,
  energyPerChapter: 1,

  coinsPerChapter: 60,
  xpPerChapter: 40,
  minigameBaseCoins: 15,
  minigameMaxCoins: 80,
  dailyGiftCoins: [40, 60, 80, 100, 130, 170, 250],
  gemsPerLevelUp: 3,

  xpBase: 100,
  xpCurve: 1.32,
  maxLevel: 50,

  dailyMissionCount: 3,
  chapterCooldownHours: 0,
  streakBreakDivisor: 2,

  adsPerDayMax: 6,
  adCooldownSeconds: 60,
  adRewardEnergy: 1,
  adRewardCoinMultiplier: 2,

  /*
    الأعلام دي بتوصف الشاشات الموجودة فعلًا، مش الخطة. كانت
    `minigames` و`shop` و`roomSnapshot` مضبوطة على `true` بينما
    الشاشات التلاتة فاضية — وده كان بيخلّي الحلقة اليومية تولّد مهامًا
    يستحيل إنجازها (DECISIONS.md#D-011).
  */
  features: {
    minigames: false, // الشاشة فاضية لسه
    room: false, // الشاشة فاضية لسه
    shop: false, // الشاشة فاضية لسه
    styleChallenge: false, // يحتاج قاعدة لاعبين — DECISIONS.md#D-010
    roomSnapshot: false, // يحتاج شاشة الغرفة الأول
    ads: true,
    subscription: false, // يُفعّل عند ربط متجر التطبيقات
  },
}

let current: GameConfig = { ...DEFAULT_CONFIG }

export function getConfig(): GameConfig {
  return current
}

/** دمج قيم من الخادم فوق الافتراضيات. آمن ضد الحقول الناقصة. */
export function hydrateConfig(remote: Partial<GameConfig>): void {
  current = {
    ...DEFAULT_CONFIG,
    ...remote,
    features: { ...DEFAULT_CONFIG.features, ...(remote.features ?? {}) },
  }
}

export function resetConfig(): void {
  current = { ...DEFAULT_CONFIG }
}

// ---- مشتقات ----

export function energyMaxForLevel(level: number): number {
  const c = getConfig()
  return c.energyMax + Math.floor((level - 1) / c.energyMaxPerLevels)
}

/** XP المطلوب للانتقال من `level` إلى `level + 1`. */
export function xpForLevel(level: number): number {
  const c = getConfig()
  return Math.round(c.xpBase * Math.pow(level, c.xpCurve))
}
