/**
 * طبقة التحليلات.
 *
 * قيود السلامة (PRODUCT_BLUEPRINT §14 · DECISIONS.md#D-002):
 * - **لا معرّفات شخصية إطلاقًا.** لا بريد، لا هاتف، لا IDFA/GAID.
 * - معرّف جلسة عشوائي محلي فقط، يمكن للاعب مسحه بإعادة التعيين.
 * - كل الأحداث تجميعية وسلوكية، ولا تُخزَّن نصوص كتبها اللاعب.
 * - الأحداث تُخزَّن مؤقتًا محليًا وتُرسل دفعة واحدة عند توفر ناقل.
 *
 * في V1 لا يوجد ناقل شبكي مفعّل — `setTransport()` هي نقطة التوصيل
 * لأي مزوّد مستقبلي (يجب أن يكون مُهيّأً لوضع «موجّه للأطفال»).
 */

export interface AnalyticsEvent {
  name: string
  props: Record<string, unknown>
  ts: number
  /** ترتيب الحدث داخل الجلسة — يسمح ببناء مسارات (funnels). */
  seq: number
}

export type Transport = (batch: AnalyticsEvent[]) => Promise<void>

const MAX_BUFFER = 500
const FLUSH_SIZE = 25

let buffer: AnalyticsEvent[] = []
let transport: Transport | null = null
let seq = 0
let enabled = true

/** معرّف جلسة عشوائي — لا يُربط بأي هوية ولا يعيش بعد إغلاق التطبيق. */
const sessionId = Math.random().toString(36).slice(2, 12)

export function setTransport(t: Transport | null): void {
  transport = t
}

export function setAnalyticsEnabled(v: boolean): void {
  enabled = v
  if (!v) buffer = []
}

export function track(name: string, props: Record<string, unknown> = {}): void {
  if (!enabled) return
  const event: AnalyticsEvent = { name, props, ts: Date.now(), seq: seq++ }
  buffer.push(event)
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER)
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props)
  }
  if (buffer.length >= FLUSH_SIZE) void flush()
}

export async function flush(): Promise<void> {
  if (!transport || buffer.length === 0) return
  const batch = buffer
  buffer = []
  try {
    await transport(batch)
  } catch {
    // أعد الأحداث للمخزن المؤقت لمحاولة لاحقة، مع احترام السقف
    buffer = [...batch, ...buffer].slice(-MAX_BUFFER)
  }
}

/** للفحص في وضع التطوير ولاختبارات QA. */
export function debugBuffer(): AnalyticsEvent[] {
  return [...buffer]
}

export function getSessionId(): string {
  return sessionId
}

// إرسال ما تبقى عند إخفاء التطبيق
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
}
