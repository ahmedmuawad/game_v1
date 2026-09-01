import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { haptic } from '@/app/haptics'
import { AvatarView } from '@/components/avatar/AvatarView'
import { assetUrl, castPortrait, outfitTags, topRarity, viewOf, type AvatarManifest } from '@/content/manifest'
import {
  advance, describeGate, evaluate, nextOf, stageAt,
  type Chapter, type Choice, type Effect, type SeasonMeta, type StoryContext,
} from '@/systems/story'
import { Button } from '@/components/ui'
import { IconBack } from '@/app/icons'
import './story.css'

interface Props {
  chapter: Chapter
  season: SeasonMeta
  manifest: AvatarManifest | null
  onExit: () => void
  onComplete: (chapterId: string, next: string | null,
               reward?: { coins?: number; gems?: number; xp?: number; items?: string[] }) => void
}

/** خلفية المشهد حسب المزاج — أرخص أداة لنقل التوتر أو الدفء. */
const MOOD_BG: Record<string, string> = {
  day:    'linear-gradient(165deg, #3C3468 0%, #1B1430 100%)',
  sunset: 'linear-gradient(165deg, #4A2A44 0%, #1E1226 100%)',
  night:  'linear-gradient(165deg, #221A44 0%, #0F0A1A 100%)',
  warm:   'linear-gradient(165deg, #46304A 0%, #1D1326 100%)',
  cool:   'linear-gradient(165deg, #26364F 0%, #121A28 100%)',
  tense:  'linear-gradient(165deg, #4A2434 0%, #1B0F18 100%)',
}

export function StoryReader({ chapter, season, manifest, onExit, onComplete }: Props) {
  const { t, tx } = useI18n()
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [path, setPath] = useState<string[]>([])

  const store = useGame()
  const v = manifest ? viewOf(manifest) : null

  const ctx = useMemo<StoryContext>(() => ({
    traits: store.traits,
    relationships: store.relationships,
    flags: store.flags,
    owned: store.owned,
    level: store.level,
    completedChapters: store.story.completed,
    outfitTags: v ? outfitTags(v, store.avatar.worn) : new Set<string>(),
    outfitRarity: v ? topRarity(v, store.avatar.worn) : 'common',
  }), [store.traits, store.relationships, store.flags, store.owned, store.level,
       store.story.completed, store.avatar.worn, v])

  const applyEffects = useCallback((effects: Effect[]) => {
    for (const e of effects) {
      if ('trait' in e) store.adjustTrait(e.trait, e.delta)
      else if ('rel' in e) store.adjustRelationship(e.rel, e.delta)
      else if ('flag' in e) store.setFlag(e.flag, e.value)
      else if ('grant' in e) store.grant(e.grant, `story:${chapter.id}`)
    }
  }, [store, chapter.id])

  const step = useMemo(() => advance(chapter, nodeId, ctx), [chapter, nodeId, ctx])
  const stepNodeId = step?.node.id

  // آثار عقد المنطق تُطبَّق مرة واحدة عند المرور بها، لا في كل إعادة رسم
  useEffect(() => {
    if (!step) return
    if (step.effects.length) applyEffects(step.effects)
    setPath((p) => [...p, ...step.visited])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepNodeId])

  const stage = useMemo(() => stageAt(chapter, path), [chapter, path])
  const node = step?.node

  const goto = useCallback((id: string | null) => {
    setNodeId(id)
    store.setStoryNode(id)
  }, [store])

  const onTap = useCallback(() => {
    if (!node) return
    const nx = nextOf(node)
    if (nx) { haptic('light'); goto(nx) }
  }, [node, goto])

  const pickChoice = useCallback((c: Choice) => {
    haptic('medium')
    if (c.effects) applyEffects(c.effects)
    goto(c.to)
  }, [applyEffects, goto])

  if (!node) {
    return (
      <div className="story story--error">
        <p className="body muted">{t('common.empty')}</p>
        <Button variant="secondary" onClick={onExit}>{t('common.back')}</Button>
      </div>
    )
  }

  const bg = MOOD_BG[stage.mood ?? 'day'] ?? MOOD_BG.day
  const speaker = node.type === 'say' ? season.characters[node.who] : null
  const emote = node.type === 'say' ? (node.emote ?? 'neutral') : 'neutral'

  return (
    <div className="story" style={{ background: bg }}>
      <div className="story__top">
        <button className="story__back" onClick={onExit} aria-label={t('common.back')}>
          <IconBack />
        </button>
        <span className="story__chapter caption">
          {t('story.chapter')} {chapter.index} · {tx(chapter.title)}
        </span>
        <span className="story__spacer" />
      </div>

      <div className="story__stage" onClick={onTap}>
        {stage.cast.filter((id) => id !== 'player').map((id, i) => {
          const active = node.type === 'say' && node.who === id
          const src = castPortrait(manifest, season.characters[id]?.portrait ?? id,
                                   active ? emote : 'neutral')
          if (!src) return null
          return (
            <motion.img
              key={id}
              className={`story__char${active ? ' story__char--active' : ''}`}
              style={{ insetInlineStart: `${4 + i * 22}%`, zIndex: active ? 3 : 1 }}
              src={assetUrl(src)}
              alt=""
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: active ? 1 : 0.5, y: 0, scale: active ? 1 : 0.93 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            />
          )
        })}

        {stage.cast.includes('player') && (
          <motion.div
            className={`story__char story__char--player${
              node.type === 'say' && node.who === 'player' ? ' story__char--active' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AvatarView config={store.avatar} manifest={manifest} height={252} crop="bust" still />
          </motion.div>
        )}
      </div>

      <div className="story__panel">
        <AnimatePresence mode="wait">
          {(node.type === 'say' || node.type === 'narrate') && (
            <motion.div
              key={node.id}
              className={`bubble${node.type === 'narrate' ? ' bubble--narrate' : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onClick={onTap}
            >
              {speaker && (
                <div className="bubble__who" style={{ color: speaker.color }}>{tx(speaker.name)}</div>
              )}
              <div className="bubble__text">{tx(node.text)}</div>
              <div className="bubble__hint caption subtle">{t('story.tapToContinue')}</div>
            </motion.div>
          )}

          {node.type === 'choice' && (
            <motion.div
              key={node.id}
              className="choices"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="choices__prompt caption muted">
                {node.prompt ? tx(node.prompt) : t('story.yourChoice')}
              </div>
              {node.options.map((o) => {
                const ok = evaluate(o.when, ctx)
                if (!ok && !o.lockedHint) return null
                return (
                  <motion.button
                    key={o.id}
                    className={`choice${ok ? '' : ' choice--locked'}`}
                    whileTap={ok ? { scale: 0.97 } : undefined}
                    disabled={!ok}
                    onClick={() => ok && pickChoice(o)}
                  >
                    <span className="choice__text">{tx(o.text)}</span>
                    {ok && o.hint && <span className="choice__hint">{tx(o.hint)}</span>}
                    {!ok && o.lockedHint && (
                      <span className="choice__hint choice__hint--locked">
                        {tx(o.lockedHint)}
                        {describeGate(o.when) === 'outfit' ? ` · ${t('style.title')}` : ''}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {node.type === 'end' && (
            <motion.div
              key={node.id}
              className="chapter-end"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
            >
              <div className="chapter-end__label caption">{t('story.chapterDone')}</div>
              {node.teaser && <div className="chapter-end__teaser body">{tx(node.teaser)}</div>}
              {node.reward && (
                <div className="chapter-end__reward u-num">
                  {node.reward.coins ? <span>+{node.reward.coins} {t('econ.coins')}</span> : null}
                  {node.reward.gems ? <span>+{node.reward.gems} {t('econ.gems')}</span> : null}
                  {node.reward.xp ? <span>+{node.reward.xp} XP</span> : null}
                </div>
              )}
              <Button
                full
                onClick={() => { haptic('success'); onComplete(chapter.id, node.nextChapter ?? null, node.reward) }}
              >
                {t('common.claim')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
