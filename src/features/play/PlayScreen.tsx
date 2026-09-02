import { useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { useToast } from '@/app/toast'
import { haptic } from '@/app/haptics'
import { celebrate } from '@/components/ui/Celebration'
import { Button, CoinIcon, CurrencyPill } from '@/components/ui'
import { IconPlay, IconSpark } from '@/app/icons'
import type { AvatarManifest } from '@/content/manifest'
import { coinsForResult, xpForResult, type GameId, type GameResult } from '@/systems/minigames'
import { StyleMatch } from './games/StyleMatch'
import { MemoryGame } from './games/MemoryGame'
import { StyleQuiz } from './games/StyleQuiz'
import { RhythmSteps } from './games/RhythmSteps'
import { RoomPuzzle } from './games/RoomPuzzle'
import './play.css'

/** كل لعبة بتاخد `onDone` وبترجّع نتيجة مطبَّعة. */
export interface MiniGameProps {
  manifest: AvatarManifest | null
  onDone: (result: GameResult) => void
}

const GAMES: { id: GameId; nameKey: string; howKey: string; hue: string }[] = [
  { id: 'style_match', nameKey: 'play.g.style_match.name', howKey: 'play.g.style_match.how', hue: 'a' },
  { id: 'memory',      nameKey: 'play.g.memory.name',      howKey: 'play.g.memory.how',      hue: 'b' },
  { id: 'quiz',        nameKey: 'play.g.quiz.name',        howKey: 'play.g.quiz.how',        hue: 'c' },
  { id: 'rhythm',      nameKey: 'play.g.rhythm.name',      howKey: 'play.g.rhythm.how',      hue: 'd' },
  { id: 'room_puzzle', nameKey: 'play.g.room_puzzle.name', howKey: 'play.g.room_puzzle.how', hue: 'e' },
]

export function PlayScreen({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, n } = useI18n()
  const { show: toast } = useToast()
  const [active, setActive] = useState<GameId | null>(null)
  const [result, setResult] = useState<{ res: GameResult; coins: number; best: boolean } | null>(null)

  const coins = useGame((s) => s.coins)
  const gems = useGame((s) => s.gems)
  const bestScores = useGame((s) => s.bestScores)
  const recordMinigame = useGame((s) => s.recordMinigame)
  const grant = useGame((s) => s.grant)

  function finish(id: GameId, res: GameResult) {
    const earned = coinsForResult(res)
    const isBest = recordMinigame(id, res.score)
    const g = grant({ coins: earned, xp: xpForResult(res) }, `minigame:${id}`)
    setResult({ res, coins: earned, best: isBest })
    haptic(isBest ? 'success' : 'select')
    if (isBest) toast(t('play.newBest'), 'good')
    /* الاحتفال بس لما يبقى فيه مستوى جديد — شاشة النتيجة نفسها
       بتعرض المكسب، فاحتفال فوقها بيبقى تكرار */
    if (g.levelsGained > 0) celebrate({ gems: g.gems, levels: g.levelsGained })
  }

  function close() {
    setActive(null)
    setResult(null)
  }

  // ---- شاشة النتيجة ----
  if (active && result) {
    return (
      <div className="screen">
        <div className="pl__resultWrap">
          <motion.div
            className="pl__result"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          >
            <IconSpark size={30} />
            <h2 className="h1">{t('play.results')}</h2>
            <p className="pl__score u-num">{n(result.res.score)} / {n(result.res.max)}</p>
            {result.best && <span className="pl__best">{t('play.newBest')}</span>}

            <div className="pl__earned">
              <span className="body-sm">{t('play.reward')}</span>
              <span className="pl__earnedVal u-num"><CoinIcon size={19} /> {n(result.coins)}</span>
            </div>

            <div className="pl__resultBtns">
              <Button variant="secondary" size="lg" onClick={() => setResult(null)}>
                {t('play.again')}
              </Button>
              <Button variant="ghost" size="lg" onClick={close}>
                {t('play.exit')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // ---- جولة شغّالة ----
  if (active) {
    const done = (res: GameResult) => finish(active, res)
    return (
      <div className="screen">
        <div className="topbar">
          <Button variant="ghost" size="sm" onClick={close}>{t('common.back')}</Button>
          <span className="topbar__spacer" />
          <h1 className="h3">{t(GAMES.find((g) => g.id === active)!.nameKey as 'play.title')}</h1>
        </div>
        {active === 'style_match' && <StyleMatch manifest={manifest} onDone={done} />}
        {active === 'memory' && <MemoryGame manifest={manifest} onDone={done} />}
        {active === 'quiz' && <StyleQuiz manifest={manifest} onDone={done} />}
        {active === 'rhythm' && <RhythmSteps manifest={manifest} onDone={done} />}
        {active === 'room_puzzle' && <RoomPuzzle manifest={manifest} onDone={done} />}
      </div>
    )
  }

  // ---- القائمة ----
  return (
    <div className="screen">
      <div className="topbar">
        <CurrencyPill kind="coins" value={n(coins)} />
        <CurrencyPill kind="gems" value={n(gems)} />
        <span className="topbar__spacer" />
        <h1 className="h3">{t('play.title')}</h1>
      </div>

      <div className="screen__scroll">
        <p className="pl__sub body-sm">{t('play.subtitle')}</p>

        <div className="pl__list">
          {GAMES.map((g) => (
            <motion.button
              key={g.id}
              className={`pl__card pl__card--${g.hue}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setActive(g.id); haptic('select') }}
            >
              <span className="pl__cardIcon"><IconPlay /></span>
              <span className="pl__cardText">
                <span className="h4">{t(g.nameKey as 'play.title')}</span>
                <span className="body-xs pl__cardHow">{t(g.howKey as 'play.title')}</span>
              </span>
              {bestScores[g.id] > 0 && (
                <span className="pl__cardBest u-num">
                  {t('play.best')} {n(bestScores[g.id])}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
