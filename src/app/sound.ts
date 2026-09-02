/**
 * الصوت — مولَّد بـWeb Audio لا ملفات مسجّلة.
 *
 * **ليه توليد بدل أصول:**
 * - صفر بايت في الحزمة. ملفات المؤثرات بتضيف مئات الكيلوبايت، والمنتج
 *   مستهدف أرخص أندرويد على شبكات ضعيفة.
 * - صفر ترخيص. كل مكتبة مؤثرات مجانية ليها شروط نسب أو استخدام،
 *   والنغمة المولَّدة مالهاش مالك.
 * - نغمة واحدة متسقة. المؤثرات المجمّعة من مصادر مختلفة بتبان ملزوقة.
 *
 * الحدّ: مش هينفع نعمل بيه موسيقى خلفية غنية. الموسيقى لو اتعملت
 * هتحتاج ملفات فعلًا — والقرار ده متأجّل عن قصد لحد ما يبقى فيه ميزانية
 * صوت، لأن موسيقى وحشة أسوأ من غير موسيقى.
 */

type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let enabled = true

/**
 * المتصفحات بتمنع إنشاء AudioContext قبل أول لمسة من المستخدم.
 * فبننشئه كسول عند أول صوت — واللمسة اللي بتطلب الصوت هي نفسها
 * الإذن المطلوب.
 */
function ensure(): Ctx | null {
  if (!enabled) return null
  if (ctx) {
    // بيرجع 'suspended' لو التطبيق راح للخلفية ورجع
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    return ctx
  } catch {
    /* جهاز بلا صوت أو سياسة صارمة — اللعبة لازم تكمّل بلا صوت */
    enabled = false
    return null
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on
  if (!on && ctx?.state === 'running') void ctx.suspend()
  if (on && ctx?.state === 'suspended') void ctx.resume()
}

interface ToneSpec {
  freq: number
  /** المدة بالثواني. */
  dur: number
  type?: OscillatorType
  /** تأخير البداية بالثواني. */
  at?: number
  gain?: number
  /** انزلاق للتردد ده بنهاية النغمة. */
  slideTo?: number
}

function tone(c: Ctx, out: GainNode, s: ToneSpec) {
  const t0 = c.currentTime + (s.at ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = s.type ?? 'sine'
  osc.frequency.setValueAtTime(s.freq, t0)
  if (s.slideTo) osc.frequency.exponentialRampToValueAtTime(s.slideTo, t0 + s.dur)

  /*
    مغلّف صاعد سريع وهابط ناعم. من غيره بيحصل «طقّة» مسموعة عند بداية
    ونهاية كل نغمة، لأن الموجة بتبدأ من صفر لقيمتها فجأة.
  */
  const peak = s.gain ?? 0.9
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur)

  osc.connect(g)
  g.connect(out)
  osc.start(t0)
  osc.stop(t0 + s.dur + 0.02)
}

/** سلّم پنتاتونيك — أي نغمتين منه بيتوافقوا، فمستحيل يطلع نشاز. */
const P = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

export type Sfx =
  | 'tap' | 'select' | 'success' | 'error' | 'coin'
  | 'levelup' | 'chapter' | 'unlock' | 'streak' | 'note'

const RECIPES: Record<Sfx, (c: Ctx, out: GainNode) => void> = {
  tap: (c, o) => tone(c, o, { freq: P[2], dur: 0.05, type: 'sine', gain: 0.35 }),

  select: (c, o) => tone(c, o, { freq: P[3], dur: 0.07, type: 'triangle', gain: 0.4 }),

  success: (c, o) => {
    tone(c, o, { freq: P[2], dur: 0.10, type: 'triangle' })
    tone(c, o, { freq: P[4], dur: 0.16, type: 'triangle', at: 0.07 })
  },

  error: (c, o) => {
    // نغمة هابطة قصيرة — «لأ» مش «غلط يا شاطرة»
    tone(c, o, { freq: 330, dur: 0.16, type: 'sine', slideTo: 246.94, gain: 0.5 })
  },

  coin: (c, o) => {
    tone(c, o, { freq: P[4], dur: 0.06, type: 'square', gain: 0.28 })
    tone(c, o, { freq: P[5], dur: 0.10, type: 'square', gain: 0.24, at: 0.05 })
  },

  levelup: (c, o) => {
    P.slice(0, 4).forEach((f, i) => tone(c, o, { freq: f, dur: 0.14, type: 'triangle', at: i * 0.075 }))
    tone(c, o, { freq: P[5], dur: 0.34, type: 'triangle', at: 0.3 })
  },

  chapter: (c, o) => {
    tone(c, o, { freq: P[0], dur: 0.22, type: 'sine', gain: 0.7 })
    tone(c, o, { freq: P[2], dur: 0.26, type: 'sine', gain: 0.6, at: 0.10 })
    tone(c, o, { freq: P[4], dur: 0.42, type: 'sine', gain: 0.5, at: 0.20 })
  },

  unlock: (c, o) => {
    tone(c, o, { freq: P[1], dur: 0.10, type: 'triangle' })
    tone(c, o, { freq: P[3], dur: 0.10, type: 'triangle', at: 0.08 })
    tone(c, o, { freq: P[5], dur: 0.22, type: 'triangle', at: 0.16 })
  },

  streak: (c, o) => {
    tone(c, o, { freq: P[3], dur: 0.09, type: 'sine' })
    tone(c, o, { freq: P[5], dur: 0.18, type: 'sine', at: 0.06 })
  },

  note: (c, o) => {
    // نغمة عشوائية من السلّم — للنقرات المتتابعة في لعبة الإيقاع
    tone(c, o, { freq: P[Math.floor(Math.random() * P.length)], dur: 0.09, type: 'triangle', gain: 0.5 })
  },
}

export function playSfx(name: Sfx): void {
  const c = ensure()
  if (!c || !master) return
  try {
    RECIPES[name](c, master)
  } catch {
    /* الصوت مايوقفش اللعب أبدًا */
  }
}
