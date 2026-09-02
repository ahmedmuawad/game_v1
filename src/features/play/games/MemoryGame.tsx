import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { haptic } from '@/app/haptics'
import { assetUrl, viewOf } from '@/content/manifest'
import { seededShuffle } from '@/systems/minigames'
import { ProgressBar } from '@/components/ui'
import type { MiniGameProps } from '../PlayScreen'

/**
 * لعبة الذاكرة بقطع الأزياء.
 *
 * الكروت من نفس كتالوج الأزياء لا من أيقونات عامة: اللاعبة بتتفرّج على
 * قطع تقدر تشتريها فعلًا، فاللعبة بتشتغل كعرض للبضاعة كمان.
 */

const PAIRS = 8

interface Card {
  key: string
  itemId: string
  src: string
  category: string
}

export function MemoryGame({ manifest, onDone }: MiniGameProps) {
  const { t } = useI18n()
  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)

  const cards = useMemo<Card[]>(() => {
    const v = manifest ? viewOf(manifest) : null
    if (!v) return []
    const seed = `mem_${Date.now()}`
    const pool = seededShuffle(
      Object.entries(v.garments).map(([id, g]) => ({ id, src: g.src, category: g.category })),
      seed,
    ).slice(0, PAIRS)
    const doubled = pool.flatMap((p) => [
      { key: `${p.id}_a`, itemId: p.id, src: p.src, category: p.category },
      { key: `${p.id}_b`, itemId: p.id, src: p.src, category: p.category },
    ])
    return seededShuffle(doubled, `${seed}_x`)
  }, [manifest])

  const pairsFound = matched.length / 2

  useEffect(() => {
    if (cards.length > 0 && pairsFound === PAIRS) {
      /*
        النتيجة بتكافئ قلّة المحاولات لا مجرد الإنهاء: كل اللاعبات
        هيخلّصوا الشبكة في الآخر، فالإنهاء وحده مش مقياس مهارة.
        الحد الأدنى للمحاولات هو عدد الأزواج نفسه.
      */
      const perfect = PAIRS
      const score = Math.max(1, Math.round((perfect / Math.max(perfect, moves)) * PAIRS))
      const timer = setTimeout(() => onDone({ score, max: PAIRS }), 700)
      return () => clearTimeout(timer)
    }
  }, [pairsFound, cards.length, moves, onDone])

  function flip(card: Card) {
    if (lock || flipped.includes(card.key) || matched.includes(card.key)) return

    const next = [...flipped, card.key]
    setFlipped(next)
    haptic('select')

    if (next.length < 2) return

    setMoves((m) => m + 1)
    const [aKey, bKey] = next
    const a = cards.find((c) => c.key === aKey)
    const b = cards.find((c) => c.key === bKey)

    if (a && b && a.itemId === b.itemId) {
      setMatched((m) => [...m, aKey, bKey])
      setFlipped([])
      haptic('success')
    } else {
      setLock(true)
      setTimeout(() => { setFlipped([]); setLock(false) }, 720)
    }
  }

  if (cards.length === 0) {
    return <div className="empty body-sm">{t('common.loading')}</div>
  }

  return (
    <div className="gm">
      <div className="gm__head">
        <ProgressBar value={pairsFound / PAIRS} />
        <div className="gm__meta">
          <span className="body-xs u-num">{t('play.pairs')} {pairsFound}/{PAIRS}</span>
          <span className="body-xs u-num">{moves}</span>
        </div>
      </div>

      <div className="mem__grid">
        {cards.map((c) => {
          const open = flipped.includes(c.key) || matched.includes(c.key)
          return (
            <motion.button
              key={c.key}
              className={`mem__card${open ? ' mem__card--open' : ''}${matched.includes(c.key) ? ' mem__card--done' : ''}`}
              whileTap={{ scale: open ? 1 : 0.94 }}
              onClick={() => flip(c)}
              aria-label={open ? c.category : t('play.g.memory.name')}
            >
              {open
                ? <img className={`tile__thumb tile__thumb--${c.category}`} src={assetUrl(c.src)} alt="" />
                : <span className="mem__back" />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
