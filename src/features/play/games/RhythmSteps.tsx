import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n'
import { haptic } from '@/app/haptics'
import { HIT_POINTS, judgeHit, type HitQuality } from '@/systems/minigames'
import { ProgressBar } from '@/components/ui'
import { useGame } from '@/state/store'
import type { MiniGameProps } from '../PlayScreen'

/**
 * خطوات الإيقاع — نقرة في التوقيت الصح.
 *
 * **التوقيت بالساعة لا بعدد الإطارات.** أي منطق مبني على `requestAnimationFrame`
 * كعدّاد بيتباطأ على الأجهزة الضعيفة وبيقف تمامًا لما التطبيق يروح
 * للخلفية — وده هيخلّي لعبة توقيت غير عادلة بالكامل على أرخص أندرويد،
 * وهو بالظبط الجهاز اللي المنتج مستهدفه.
 */

const NOTES = 14
const INTERVAL = 900
const LEAD = 1800

interface Note {
  id: number
  at: number
  hit: HitQuality | null
}

export function RhythmSteps({ onDone }: MiniGameProps) {
  const { t, n } = useI18n()
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  const [notes, setNotes] = useState<Note[]>([])
  const [now, setNow] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [last, setLast] = useState<HitQuality | null>(null)
  const startRef = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const t0 = performance.now() + LEAD
    startRef.current = t0
    setNotes(Array.from({ length: NOTES }, (_, i) => ({ id: i, at: t0 + i * INTERVAL, hit: null })))

    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const finish = useCallback((list: Note[]) => {
    if (doneRef.current) return
    doneRef.current = true
    const total = list.reduce((s, x) => s + (x.hit ? HIT_POINTS[x.hit] : 0), 0)
    onDone({ score: total, max: NOTES * HIT_POINTS.perfect })
  }, [onDone])

  // تعليم النوتات اللي عدّت بلا نقرة، وإنهاء الجولة
  useEffect(() => {
    if (notes.length === 0 || doneRef.current) return
    let changed = false
    const next = notes.map((x) => {
      if (x.hit === null && now - x.at > 220) { changed = true; return { ...x, hit: 'miss' as const } }
      return x
    })
    if (changed) {
      setNotes(next)
      setStreak(0)
      setLast('miss')
    }
    const list = changed ? next : notes
    if (list.every((x) => x.hit !== null)) finish(list)
  }, [now, notes, finish])

  function tap() {
    if (doneRef.current) return
    const t = performance.now()
    // أقرب نوتة لسه ماتقيّمتش
    let best: Note | null = null
    for (const x of notes) {
      if (x.hit !== null) continue
      if (!best || Math.abs(x.at - t) < Math.abs(best.at - t)) best = x
    }
    if (!best) return

    const q = judgeHit(t - best.at)
    if (q === 'miss') { haptic('error'); setStreak(0); setLast('miss'); return }

    const target = best
    setNotes((prev) => prev.map((x) => (x.id === target.id ? { ...x, hit: q } : x)))
    setScore((s) => s + HIT_POINTS[q])
    setStreak((s) => s + 1)
    setLast(q)
    haptic(q === 'perfect' ? 'success' : 'select')
  }

  const done = notes.filter((x) => x.hit !== null).length
  /* النوتات القادمة فقط — الشاشة بتعرض اللي جاي في نافذة LEAD */
  const incoming = notes.filter((x) => x.hit === null && x.at - now < LEAD && x.at - now > -260)

  return (
    <div className="gm">
      <div className="gm__head">
        <ProgressBar value={done / NOTES} />
        <div className="gm__meta">
          <span className="body-xs u-num">{t('play.score')} {n(score)}</span>
          <span className="body-xs u-num">{t('play.streakLabel')} {streak}</span>
        </div>
      </div>

      <button type="button" className="rh__field" onClick={tap} aria-label={t('play.tapToStart')}>
        <span className="rh__line" />
        {incoming.map((x) => {
          const p = 1 - (x.at - now) / LEAD
          return (
            <span
              key={x.id}
              className="rh__note"
              style={{
                /*
                  الموضع محسوب من الساعة مباشرة كل إطار بدل انتقال CSS:
                  الانتقال بيبدأ من لحظة الإدراج فبيتزحلق لو الإطار
                  اتأخّر، والنتيجة نوتة شكلها على الخط وهي مش عليه.
                */
                top: `${Math.max(0, Math.min(1, p)) * 100}%`,
                transition: reduceMotion ? 'none' : undefined,
              }}
            />
          )
        })}
        {last && (
          <span className={`rh__judge rh__judge--${last}`}>
            {t(last === 'perfect' ? 'play.perfect' : last === 'good' ? 'play.good' : 'play.miss')}
          </span>
        )}
      </button>
    </div>
  )
}
