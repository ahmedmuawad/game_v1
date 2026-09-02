import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { haptic } from '@/app/haptics'
import { assetUrl, viewOf, type GarmentLayer } from '@/content/manifest'
import { seededShuffle } from '@/systems/minigames'
import { ProgressBar } from '@/components/ui'
import type { StyleTag } from '@/state/types'
import type { MiniGameProps } from '../PlayScreen'

/**
 * طابقي الستايل — بيجيلك وسم ستايل وتختاري القطعة اللي تحمله.
 *
 * دي اللعبة الوحيدة اللي بتعلّم مفردات المنتج نفسه: أوسمة الستايل هي
 * الجسر بين التخصيص والقصة (DECISIONS.md#D-003)، وشخصيات القصة
 * بتعلّق على إطلالتك بناءً عليها. فاللعب هنا مش تسلية جنبية — بيدرّب
 * على النظام اللي القصة بتقيس بيه.
 */

const ROUNDS = 6
const OPTIONS = 3

const TAG_KEY: Partial<Record<StyleTag, string>> = {
  casual: 'style.tag.casual', soft: 'style.tag.soft', bold: 'style.tag.bold',
  sporty: 'style.tag.sporty', formal: 'style.tag.formal', cozy: 'style.tag.cozy',
  dreamy: 'style.tag.dreamy',
}

interface Round {
  tag: StyleTag
  options: (GarmentLayer & { id: string })[]
  answerId: string
}

export function StyleMatch({ manifest, onDone }: MiniGameProps) {
  const { t, tx } = useI18n()
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const rounds = useMemo<Round[]>(() => {
    const v = manifest ? viewOf(manifest) : null
    if (!v) return []
    const all = Object.entries(v.garments).map(([id, g]) => ({ ...g, id }))
    const seed = `sm_${Date.now()}`
    const out: Round[] = []

    // الأوسمة اللي فيها قطع كفاية عشان نبني منها سؤال له إجابة وحيدة
    const tags = (['soft', 'bold', 'sporty', 'formal', 'cozy'] as StyleTag[])
      .filter((tg) => all.some((g) => g.tags.includes(tg)))

    for (let r = 0; r < ROUNDS && tags.length > 0; r++) {
      const tag = seededShuffle(tags, `${seed}_t${r}`)[0]
      const matching = all.filter((g) => g.tags.includes(tag))
      /*
        المشتّتات لازم **ماتحملش** الوسم المطلوب، وإلا بقى للسؤال أكتر
        من إجابة صحيحة واللاعبة تتعاقب على إجابة سليمة.
      */
      const distractors = all.filter((g) => !g.tags.includes(tag))
      if (matching.length === 0 || distractors.length < OPTIONS - 1) continue

      const answer = seededShuffle(matching, `${seed}_a${r}`)[0]
      const picks = seededShuffle(distractors, `${seed}_d${r}`).slice(0, OPTIONS - 1)
      out.push({
        tag,
        options: seededShuffle([answer, ...picks], `${seed}_o${r}`),
        answerId: answer.id,
      })
    }
    return out
  }, [manifest])

  if (rounds.length === 0) {
    return <div className="empty body-sm">{t('common.loading')}</div>
  }

  const round = rounds[Math.min(i, rounds.length - 1)]

  function choose(id: string) {
    if (picked) return
    setPicked(id)
    const right = id === round.answerId
    if (right) setScore((s) => s + 1)
    haptic(right ? 'success' : 'error')

    setTimeout(() => {
      setPicked(null)
      if (i + 1 >= rounds.length) {
        onDone({ score: right ? score + 1 : score, max: rounds.length })
      } else {
        setI((x) => x + 1)
      }
    }, 620)
  }

  return (
    <div className="gm">
      <div className="gm__head">
        <ProgressBar value={(i + 1) / rounds.length} />
        <div className="gm__meta">
          <span className="body-xs">{t('play.round', { n: i + 1 })}</span>
          <span className="body-xs u-num">{t('play.correct')} {score}</span>
        </div>
      </div>

      <div className="sm__brief">
        <span className="caption">{t('play.g.style_match.brief')}</span>
        <span className="h2">{t((TAG_KEY[round.tag] ?? 'style.tag.casual') as 'style.tag.casual')}</span>
      </div>

      <div className="sm__opts">
        {round.options.map((g) => {
          const state = !picked ? ''
            : g.id === round.answerId ? ' sm__opt--right'
            : g.id === picked ? ' sm__opt--wrong' : ' sm__opt--dim'
          return (
            <motion.button
              key={g.id}
              className={`sm__opt${state}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(g.id)}
              aria-label={tx(g.name)}
            >
              <img className={`tile__thumb tile__thumb--${g.category}`} src={assetUrl(g.src)} alt="" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
