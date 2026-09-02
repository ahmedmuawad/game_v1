import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { haptic } from '@/app/haptics'
import { seededShuffle } from '@/systems/minigames'
import { ProgressBar } from '@/components/ui'
import { QUIZ_BANK, type QuizQuestion } from '@/content/quiz'
import type { MiniGameProps } from '../PlayScreen'

/**
 * اختبار الستايل — أسئلة من بنك بيانات لا مكتوبة في المكوّن (قاعدة #4).
 *
 * **مفيش سؤال «إجابته الصح» ذوق شخصي.** الأسئلة كلها عن حقائق النظام
 * (إيه اللي يناسب مناسبة رسمية؟ إيه اللي بيدفّي؟) لا عن «إيه الأحلى».
 * تقييم ذوق بنت بصح وغلط في لعبة موجّهة لسنّها ده تعليم إن ليها ذوق
 * غلط — وده عكس اللي المنتج ده بيحاول يعمله.
 */

const ROUNDS = 6

export function StyleQuiz({ onDone }: MiniGameProps) {
  const { t, tx } = useI18n()
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  const questions = useMemo<QuizQuestion[]>(
    () => seededShuffle(QUIZ_BANK, `q_${Date.now()}`).slice(0, ROUNDS),
    [],
  )

  const q = questions[Math.min(i, questions.length - 1)]

  function choose(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    const right = idx === q.answer
    if (right) setScore((s) => s + 1)
    haptic(right ? 'success' : 'error')

    setTimeout(() => {
      setPicked(null)
      if (i + 1 >= questions.length) {
        onDone({ score: right ? score + 1 : score, max: questions.length })
      } else {
        setI((x) => x + 1)
      }
    }, 700)
  }

  return (
    <div className="gm">
      <div className="gm__head">
        <ProgressBar value={(i + 1) / questions.length} />
        <div className="gm__meta">
          <span className="body-xs">{t('play.round', { n: i + 1 })}</span>
          <span className="body-xs u-num">{t('play.correct')} {score}</span>
        </div>
      </div>

      <div className="qz__q">
        <h2 className="h3">{tx(q.prompt)}</h2>
      </div>

      <div className="qz__opts">
        {q.options.map((opt, idx) => {
          const state = picked === null ? ''
            : idx === q.answer ? ' qz__opt--right'
            : idx === picked ? ' qz__opt--wrong' : ' qz__opt--dim'
          return (
            <motion.button
              key={idx}
              className={`qz__opt${state}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => choose(idx)}
            >
              {tx(opt)}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
