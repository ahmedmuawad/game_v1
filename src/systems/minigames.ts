import { getConfig, type GameConfig } from '@/systems/config'

/**
 * منطق الألعاب المصغّرة — نقي بلا React ولا وصول للمخزن (قاعدة #3).
 */

export type GameId = 'style_match' | 'memory' | 'quiz' | 'rhythm' | 'room_puzzle'

export const GAME_IDS: GameId[] = ['style_match', 'memory', 'quiz', 'rhythm', 'room_puzzle']

export interface GameResult {
  /** نتيجة اللعبة الخام. */
  score: number
  /** أقصى نتيجة ممكنة في الجولة دي — لتطبيع المكافأة. */
  max: number
}

/**
 * المكافأة من النتيجة.
 *
 * **بنطبّع على أقصى نتيجة ممكنة لا على رقم مطلق.** لعبة الذاكرة أقصاها
 * 8 أزواج ولعبة الإيقاع أقصاها 40 نقرة؛ لو ربطنا المكافأة بالرقم الخام
 * كانت لعبة واحدة هتبقى مزرعة عملات والباقي بلا معنى.
 *
 * الحد الأدنى بيتصرف حتى مع نتيجة صفر: الجمهور أطفال، والخروج من لعبة
 * بلا أي مقابل بيعلّم إن المحاولة نفسها مالهاش قيمة. الفرق بين الأداء
 * الضعيف والممتاز بيفضل واضح (15 مقابل 80) من غير ما نعاقب المحاولة.
 */
export function coinsForResult(
  result: GameResult,
  cfg: GameConfig = getConfig(),
): number {
  const { minigameBaseCoins: base, minigameMaxCoins: max } = cfg
  if (result.max <= 0) return base
  const ratio = Math.max(0, Math.min(1, result.score / result.max))
  return Math.round(base + (max - base) * ratio)
}

/** مكافأة الخبرة — أبسط: نسبة ثابتة من العملات. */
export function xpForResult(result: GameResult, cfg: GameConfig = getConfig()): number {
  return Math.max(5, Math.round(coinsForResult(result, cfg) * 0.4))
}

/**
 * مضاعف المتتالية.
 *
 * بيوصل لسقف عند 5: بلا سقف، جولة واحدة موفّقة بتطلّع مكافأة تكسر
 * الاقتصاد كله، والفرق بين متتالية 10 و20 مش بيضيف إحساسًا بالمهارة.
 */
export function comboMultiplier(streak: number): number {
  if (streak < 2) return 1
  return Math.min(5, 1 + (streak - 1) * 0.25)
}

/** خلط ثابت ببذرة — نفس البذرة تدّي نفس الترتيب. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * تقييم دقّة النقرة في لعبة الإيقاع.
 * النافذة بالملّي ثانية حوالين اللحظة المثالية.
 */
export type HitQuality = 'perfect' | 'good' | 'miss'

export function judgeHit(deltaMs: number): HitQuality {
  const d = Math.abs(deltaMs)
  if (d <= 90) return 'perfect'
  if (d <= 220) return 'good'
  return 'miss'
}

export const HIT_POINTS: Record<HitQuality, number> = {
  perfect: 3,
  good: 1,
  miss: 0,
}
