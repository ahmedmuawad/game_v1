/**
 * ملاحظات لمسية.
 * تستخدم Vibration API على الويب؛ نقطة الوصل بـ Capacitor Haptics
 * على الأجهزة الأصلية موجودة في `setHapticImpl`.
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

type Impl = (kind: HapticKind) => void

let impl: Impl | null = null
let enabled = true

export function setHapticImpl(fn: Impl | null): void { impl = fn }
export function setHapticsEnabled(v: boolean): void { enabled = v }

export function haptic(kind: HapticKind): void {
  if (!enabled) return
  if (impl) { impl(kind); return }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(WEB_PATTERNS[kind]) } catch { /* غير مدعوم */ }
  }
}
