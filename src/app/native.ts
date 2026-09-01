import { Capacitor } from '@capacitor/core'
import { setHapticImpl, type HapticKind } from './haptics'

/**
 * التوصيل بالقدرات الأصلية.
 *
 * كل شيء اختياري: على الويب تبقى الدوال بلا أثر، فنفس الكود يعمل في
 * المتصفح وفي التطبيق الأصلي بلا تفرّع في منطق الميزات.
 */

export const isNative = (): boolean => Capacitor.isNativePlatform()
export const platform = (): string => Capacitor.getPlatform()

export async function initNative(): Promise<void> {
  if (!isNative()) return

  // ---- الاهتزاز الأصلي بدل Vibration API ----
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    const impact: Record<string, () => Promise<void>> = {
      light:  () => Haptics.impact({ style: ImpactStyle.Light }),
      medium: () => Haptics.impact({ style: ImpactStyle.Medium }),
      heavy:  () => Haptics.impact({ style: ImpactStyle.Heavy }),
      select: () => Haptics.selectionChanged(),
      success: () => Haptics.notification({ type: NotificationType.Success }),
      warning: () => Haptics.notification({ type: NotificationType.Warning }),
      error:   () => Haptics.notification({ type: NotificationType.Error }),
    }
    setHapticImpl((kind: HapticKind) => { void impact[kind]?.() })
  } catch { /* الإضافة غير متاحة */ }

  // ---- شريط الحالة ----
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch { /* غير مدعوم على هذه المنصة */ }
}

/**
 * حفظ الحالة في التخزين الأصلي بدل localStorage.
 *
 * السبب: على iOS النظام قد يمسح تخزين WebView عند ضغط المساحة — وضياع
 * تقدّم اللاعبة أسوأ عطل ممكن في لعبة بلا حساب سحابي (DECISIONS.md#D-006).
 */
export async function nativeStorage() {
  if (!isNative()) return null
  try {
    const { Preferences } = await import('@capacitor/preferences')
    return {
      getItem: async (k: string) => (await Preferences.get({ key: k })).value,
      setItem: async (k: string, v: string) => { await Preferences.set({ key: k, value: v }) },
      removeItem: async (k: string) => { await Preferences.remove({ key: k }) },
    }
  } catch {
    return null
  }
}
