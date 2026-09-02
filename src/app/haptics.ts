import { playSfx, type Sfx } from './sound'

/**
 * ملاحظات لمسية — ومعاها الصوت المقابل لها.
 *
 * الاتنين متجوّزين هنا عن قصد: كل نداء `haptic()` في التطبيق هو أصلًا
 * لحظة «حصل حاجة»، وهي بالظبط اللحظة اللي عايزين نسمّعها. الفصل بينهم
 * كان معناه إضافة نداء صوت جنب كل نداء اهتزاز في عشرات المواضع —
 * وأول موضع يتنسي بيبقى لحظة صامتة بلا سبب.
 *
 * اللي محتاج صوت مخصوص (عملة، مستوى، فصل) بينادي `playSfx` مباشرة.
 */

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select'

const WEB_PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  select: 5,
  success: [12, 40, 22],
  warning: [18, 60, 18],
  error: [26, 50, 26, 50, 26],
}

/** الصوت المقابل لكل نوع لمسة. */
const SFX_FOR: Record<HapticKind, Sfx> = {
  light: 'tap',
  medium: 'tap',
  heavy: 'select',
  select: 'select',
  success: 'success',
  warning: 'error',
  error: 'error',
}

type Impl = (kind: HapticKind) => void

let impl: Impl | null = null
let enabled = true

export function setHapticImpl(fn: Impl | null): void { impl = fn }
export function setHapticsEnabled(v: boolean): void { enabled = v }

/**
 * الاهتزاز والصوت مستقلين في الإعدادات: ناس بتقفل الاهتزاز عشان
 * البطارية وناس بتقفل الصوت عشان هي في مكان عام. فكل واحد له مفتاحه،
 * وقفل واحد مابيقفلش التاني.
 */
export function haptic(kind: HapticKind): void {
  playSfx(SFX_FOR[kind])
  if (!enabled) return
  if (impl) { impl(kind); return }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(WEB_PATTERNS[kind]) } catch { /* غير مدعوم */ }
  }
}
