import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { haptic } from '@/app/haptics'
import { FURNITURE } from '@/components/room/furniture'
import { ROOM_ITEMS, type RoomItem } from '@/content/room'
import { seededShuffle } from '@/systems/minigames'
import { ProgressBar } from '@/components/ui'
import type { RoomSlot } from '@/state/types'
import type { MiniGameProps } from '../PlayScreen'

/**
 * رتّبي الغرفة — وصّلي كل قطعة بمكانها الصح.
 *
 * لعبة تصنيف لا لعبة سحب: السحب والإفلات على شاشة 360px بصوابع صغيرة
 * تجربة سيئة بشكل موثّق، ونفس المهارة (معرفة إن السجادة على الأرض
 * والملصق على الحائط) بتتقاس بلمستين بلا إحباط.
 */

const ROUNDS = 6

const SLOT_KEY: Record<string, string> = {
  bed: 'room.cat.bed', desk: 'room.cat.desk', rug: 'room.cat.rug',
  poster: 'room.cat.poster', plant: 'room.cat.plant',
  shelf: 'room.cat.shelf', lamp: 'room.cat.lamp',
}

export function RoomPuzzle({ onDone }: MiniGameProps) {
  const { t, tx } = useI18n()
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<RoomSlot | null>(null)

  const rounds = useMemo(() => {
    const seed = `rp_${Date.now()}`
    const slots = [...new Set(ROOM_ITEMS.map((x) => x.slot))]
    const items = seededShuffle(ROOM_ITEMS, seed).slice(0, ROUNDS)
    return items.map((item, idx) => {
      /*
        البدائل بتتسحب من فتحات تانية موجودة فعلًا: اختيار عشوائي من كل
        الفتحات الممكنة كان هيطرح فتحات فاضية كإجابات، وده بيخلّي
        السؤال يقيس التخمين لا المعرفة.
      */
      const others = slots.filter((s) => s !== item.slot)
      const distractors = seededShuffle(others, `${seed}_d${idx}`).slice(0, 2)
      return {
        item,
        options: seededShuffle([item.slot, ...distractors], `${seed}_o${idx}`) as RoomSlot[],
      }
    })
  }, [])

  const round = rounds[Math.min(i, rounds.length - 1)]

  function choose(slot: RoomSlot) {
    if (picked) return
    setPicked(slot)
    const right = slot === round.item.slot
    if (right) setScore((s) => s + 1)
    haptic(right ? 'success' : 'error')

    setTimeout(() => {
      setPicked(null)
      if (i + 1 >= rounds.length) {
        onDone({ score: right ? score + 1 : score, max: rounds.length })
      } else {
        setI((x) => x + 1)
      }
    }, 650)
  }

  const shape = FURNITURE[round.item.shape]

  return (
    <div className="gm">
      <div className="gm__head">
        <ProgressBar value={(i + 1) / rounds.length} />
        <div className="gm__meta">
          <span className="body-xs">{t('play.round', { n: i + 1 })}</span>
          <span className="body-xs u-num">{t('play.correct')} {score}</span>
        </div>
      </div>

      <div className="rp__piece">
        {shape && (
          <svg viewBox="-8 -8 256 128" className="rp__svg" aria-hidden="true">
            {shape({ colors: round.item.colors })}
          </svg>
        )}
        <span className="body-sm rp__name">{tx((round.item as RoomItem).name)}</span>
      </div>

      <div className="qz__opts">
        {round.options.map((slot) => {
          const state = !picked ? ''
            : slot === round.item.slot ? ' qz__opt--right'
            : slot === picked ? ' qz__opt--wrong' : ' qz__opt--dim'
          return (
            <motion.button
              key={slot}
              className={`qz__opt${state}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => choose(slot)}
            >
              {t((SLOT_KEY[slot] ?? 'room.cat.decor') as 'room.cat.bed')}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
