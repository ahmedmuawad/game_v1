import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { playSfx } from '@/app/sound'
import { CoinIcon, GemIcon } from './index'
import { IconSpark } from '@/app/icons'
import './celebration.css'

/**
 * احتفال المكافأة.
 *
 * اللحظة اللي بتتكسب فيها حاجة كانت بتعدّي كـtoast رمادي في ركن الشاشة —
 * نفس شكل رسالة الخطأ بالظبط. الفرق بين «كسبتي 80 عملة» و«الفلوس مش
 * كافية» كان لونًا صغيرًا. الكسب لازم يتحس.
 *
 * **بيتقفل لوحده وبيتقفل باللمس.** الاحتفال اللي بيستنى تأكيد بيتحوّل
 * لخطوة زيادة بعد كل مكافأة، والمكافآت هنا كتيرة (كل مهمة، كل لعبة،
 * كل فصل).
 */

export interface CelebrationPayload {
  coins?: number
  gems?: number
  xp?: number
  title?: string
  /** مستويات اتكسبت في نفس اللحظة. */
  levels?: number
}

let emit: ((p: CelebrationPayload) => void) | null = null

/** يُنادى من أي مكان — مش محتاج context. */
export function celebrate(p: CelebrationPayload): void {
  emit?.(p)
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => i)

export function CelebrationHost() {
  const { t, n } = useI18n()
  const [payload, setPayload] = useState<CelebrationPayload | null>(null)
  const reduceMotion = useGame((s) => s.settings.reduceMotion)

  useEffect(() => {
    emit = (p) => {
      setPayload(p)
      playSfx(p.levels && p.levels > 0 ? 'levelup' : p.gems ? 'unlock' : 'coin')
    }
    return () => { emit = null }
  }, [])

  useEffect(() => {
    if (!payload) return
    const ms = payload.levels && payload.levels > 0 ? 2600 : 1800
    const timer = setTimeout(() => setPayload(null), ms)
    return () => clearTimeout(timer)
  }, [payload])

  return (
    <AnimatePresence>
      {payload && (
        <motion.button
          type="button"
          className="celeb"
          aria-label={t('common.close')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setPayload(null)}
        >
          <motion.div
            className="celeb__card"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.7, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 300 }}
          >
            {!reduceMotion && (
              <div className="celeb__confetti" aria-hidden="true">
                {CONFETTI.map((i) => (
                  <motion.span
                    key={i}
                    className={`celeb__bit celeb__bit--${i % 4}`}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{
                      /* انتشار دائري — القيم ثابتة لكل قصاصة فالحركة متسقة */
                      x: Math.cos((i / CONFETTI.length) * Math.PI * 2) * 108,
                      y: Math.sin((i / CONFETTI.length) * Math.PI * 2) * 108 + 40,
                      opacity: 0,
                      rotate: i % 2 ? 220 : -220,
                    }}
                    transition={{ duration: 1.15, ease: 'easeOut' }}
                  />
                ))}
              </div>
            )}

            <span className="celeb__spark"><IconSpark size={26} /></span>

            {payload.levels && payload.levels > 0 ? (
              <span className="h3 celeb__title">{t('reward.levelUp')}</span>
            ) : (
              <span className="h4 celeb__title">{payload.title ?? t('reward.title')}</span>
            )}

            <div className="celeb__row">
              {!!payload.coins && (
                <span className="celeb__amt u-num"><CoinIcon size={20} /> +{n(payload.coins)}</span>
              )}
              {!!payload.gems && (
                <span className="celeb__amt u-num"><GemIcon size={20} /> +{n(payload.gems)}</span>
              )}
            </div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
