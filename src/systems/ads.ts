import { getConfig } from './config'
import { track } from './analytics'

/**
 * طبقة الإعلانات.
 *
 * قواعد غير قابلة للتفاوض (DECISIONS.md#D-002):
 * 1. **إعلانات غير مخصّصة فقط** — `npa: true` دائمًا، بلا استثناء.
 * 2. **مكافِئة فقط** — لا إعلانات بينية ولا بانرات في V1.
 * 3. **اختيارية 100%** — اللاعب يبدأ الإعلان بنفسه ويربح دائمًا.
 * 4. **سقف يومي صارم** — تُعطَّل الأزرار بعد بلوغه، بلا التفاف.
 *
 * `AdProvider` هو نقطة الوصل بـ AdMob عبر Capacitor لاحقًا.
 * المحاكاة هنا تسمح باختبار كامل المسار بلا SDK.
 */

export type AdPlacement =
  | 'double_minigame_reward'
  | 'extra_energy'
  | 'bonus_daily'
  | 'unlock_preview'

export type AdResult = 'completed' | 'dismissed' | 'unavailable' | 'capped' | 'cooldown'

export interface AdProvider {
  /** يجب أن يهيّئ الـ SDK في وضع غير مخصّص وموجّه للأطفال. */
  init(): Promise<void>
  isReady(): boolean
  show(placement: AdPlacement): Promise<'completed' | 'dismissed'>
}

/** مزوّد محاكاة للتطوير والاختبار — لا يعرض إعلانًا حقيقيًا. */
export class MockAdProvider implements AdProvider {
  private ready = false
  async init(): Promise<void> {
    this.ready = true
  }
  isReady(): boolean {
    return this.ready
  }
  async show(): Promise<'completed' | 'dismissed'> {
    await new Promise((r) => setTimeout(r, 900))
    return 'completed'
  }
}

let provider: AdProvider = new MockAdProvider()
let lastShownAt = 0

export function setAdProvider(p: AdProvider): void {
  provider = p
}

export async function initAds(): Promise<void> {
  if (!getConfig().features.ads) return
  await provider.init()
}

export interface AdGateState {
  /** هل يمكن عرض إعلان الآن؟ */
  canShow: boolean
  /** السبب لو لم يمكن. */
  reason: 'ok' | 'disabled' | 'capped' | 'cooldown' | 'unavailable'
  /** ثوانٍ متبقية من فترة التهدئة. */
  cooldownLeft: number
  /** كم إعلانًا بقي اليوم. */
  remainingToday: number
}

export function adGate(adsWatchedToday: number, now = Date.now()): AdGateState {
  const cfg = getConfig()
  const remainingToday = Math.max(0, cfg.adsPerDayMax - adsWatchedToday)

  if (!cfg.features.ads) {
    return { canShow: false, reason: 'disabled', cooldownLeft: 0, remainingToday }
  }
  if (remainingToday <= 0) {
    return { canShow: false, reason: 'capped', cooldownLeft: 0, remainingToday: 0 }
  }
  const elapsed = (now - lastShownAt) / 1000
  if (lastShownAt > 0 && elapsed < cfg.adCooldownSeconds) {
    return {
      canShow: false,
      reason: 'cooldown',
      cooldownLeft: Math.ceil(cfg.adCooldownSeconds - elapsed),
      remainingToday,
    }
  }
  if (!provider.isReady()) {
    return { canShow: false, reason: 'unavailable', cooldownLeft: 0, remainingToday }
  }
  return { canShow: true, reason: 'ok', cooldownLeft: 0, remainingToday }
}

export async function showRewardedAd(
  placement: AdPlacement,
  adsWatchedToday: number,
): Promise<AdResult> {
  const gate = adGate(adsWatchedToday)
  if (!gate.canShow) {
    track('ad_blocked', { placement, reason: gate.reason })
    return gate.reason === 'capped' ? 'capped'
      : gate.reason === 'cooldown' ? 'cooldown'
      : 'unavailable'
  }

  track('ad_requested', { placement })
  try {
    const outcome = await provider.show(placement)
    lastShownAt = Date.now()
    track(outcome === 'completed' ? 'ad_completed' : 'ad_dismissed', { placement })
    return outcome
  } catch {
    track('ad_error', { placement })
    return 'unavailable'
  }
}

/** لأغراض الاختبار. */
export function resetAdCooldown(): void {
  lastShownAt = 0
}
