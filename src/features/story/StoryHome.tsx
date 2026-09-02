import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame, selectEnergyMax } from '@/state/store'
import { useToast } from '@/app/toast'
import { haptic } from '@/app/haptics'
import { celebrate } from '@/components/ui/Celebration'
import { AvatarView } from '@/components/avatar/AvatarView'
import type { AvatarManifest } from '@/content/manifest'
import { loadChapter, loadSeason, prefetchChapter, type Chapter, type SeasonMeta } from '@/systems/story'
import { Button, CurrencyPill, ProgressBar, EmptyState } from '@/components/ui'
import { IconLock, IconCheck, IconSpark, IconSettings } from '@/app/icons'
import { levelProgress } from '@/systems/progression'
import { DailyCard } from '@/features/daily/DailyCard'
import { SettingsSheet } from '@/features/settings/SettingsSheet'
import { StoryReader } from './StoryReader'
import './story-home.css'

export function StoryHome({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, tx, n } = useI18n()
  const { show: toast } = useToast()
  const [season, setSeason] = useState<SeasonMeta | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [active, setActive] = useState<Chapter | null>(null)
  const [busy, setBusy] = useState(false)

  const store = useGame()
  const energyMax = useGame(selectEnergyMax)
  const done = store.story.completed

  useEffect(() => {
    loadSeason(store.story.seasonId)
      .then((s) => {
        setSeason(s)
        prefetchChapter(s.id, store.story.chapterId)
      })
      .catch((e) => console.error('[story] تعذّر تحميل الموسم', e))
  }, [store.story.seasonId, store.story.chapterId])

  const chapters = useMemo(() => {
    if (!season) return []
    return season.chapters.map((c, i) => {
      const isDone = done.includes(c.id)
      const prev = i === 0 ? null : season.chapters[i - 1].id
      const unlocked = isDone || i === 0 || (prev ? done.includes(prev) : false)
      return { ...c, index: i + 1, isDone, unlocked }
    })
  }, [season, done])

  async function open(chapterId: string, replay: boolean) {
    if (!season || busy) return
    if (!replay && !store.consumeEnergy()) {
      toast(t('story.noEnergy.title'), 'warn')
      haptic('warning')
      return
    }
    setBusy(true)
    try {
      const ch = await loadChapter(season.id, chapterId)
      setActive(ch)
      haptic('medium')
    } catch (e) {
      console.error(e)
      toast(t('common.empty'), 'bad')
    } finally {
      setBusy(false)
    }
  }

  function complete(chapterId: string, next: string | null,
                    reward?: { coins?: number; gems?: number; xp?: number; items?: string[] }) {
    if (reward) {
      const g = store.grant(reward, `chapter:${chapterId}`)
      celebrate({ coins: g.coins, gems: g.gems, levels: g.levelsGained, title: tx(active?.title) })
    }
    store.completeChapter(chapterId, next)
    if (next && season) prefetchChapter(season.id, next)
    setActive(null)

    /*
      نهاية الموسم مش نهاية اللعبة.
      `next === null` معناها إن الفصل ده آخر فصل، وقبل كده كانت اللاعبة
      بتقف عند شاشة كل فصولها مكتملة بلا أي طريق قدّام. الانتقال بيتقرا
      من بيانات الموسم (`nextSeason`) عشان موسم جديد يوصل بلا تحديث
      في المتجر (قاعدة #4).
    */
    if (next === null && season?.nextSeason) {
      const target = season.nextSeason
      loadSeason(target)
        .then((meta) => {
          const first = meta.chapters[0]?.id
          if (first) store.startSeason(target, first)
        })
        .catch((e) => {
          console.error('[story] فشل تحميل الموسم التالي', e)
          toast(t('common.empty'), 'bad')
        })
    }
  }

  if (active && season) {
    return (
      <StoryReader
        chapter={active}
        season={season}
        manifest={manifest}
        onExit={() => setActive(null)}
        onComplete={complete}
      />
    )
  }

  const nextChapter = chapters.find((c) => !c.isDone && c.unlocked)

  return (
    <div className="screen">
      <div className="topbar">
        <CurrencyPill kind="coins" value={n(store.coins)} />
        <CurrencyPill kind="gems" value={n(store.gems)} />
        <span className="topbar__spacer" />
        <CurrencyPill kind="energy" value={`${store.energy}/${energyMax}`} />
        {/*
          الترس هنا لا في تبويب سادس: شريط التنقل خمس تبويبات وهي حدّ
          الراحة على شاشة 360px، والإعدادات مش وجهة يومية.
        */}
        <button
          type="button"
          className="topbar__gear"
          aria-label={t('settings.title')}
          onClick={() => { setSettingsOpen(true); haptic('select') }}
        >
          <IconSettings />
        </button>
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="screen__scroll">
        <header className="home__hero">
          <div className="home__hero-text">
            {/*
              الاسم اللي كتبته اللاعبة يظهر هنا. الشرط كان بيتأكد إن فيه
              اسم وبعدين يعرض نص الترحيب العام بدله — بقايا من وقت ما
              الأونبوردنج مكانش موجود، فاللاعبة كانت بتكتب اسمها
              وماتشوفوش في أي مكان في اللعبة.
            */}
            <h1 className="h1">
              {store.name ? t('home.greeting', { name: store.name }) : t('app.name')}
            </h1>
            {/* السلسلة اتشالت من هنا — بقت معروضة بوضوح في كارت اليوم تحت */}
            <div className="caption muted">
              {t('common.level')} {store.level}
            </div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={levelProgress(store.level, store.xp)} />
            </div>
          </div>
          <AvatarView config={store.avatar} manifest={manifest} height={84} crop="head" still className="home__face" />
        </header>

        <DailyCard />

        {season && nextChapter && (
          <motion.section
            className="card chapter-hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="chapter-hero__glow" />
            <div className="chapter-hero__body">
              <div className="caption chapter-hero__eyebrow">
                {tx(season.title)} · {t('story.chapter')} {nextChapter.index}
              </div>
              <h2 className="h2">{tx(nextChapter.title)}</h2>
              <p className="body-sm muted">{tx(nextChapter.teaser)}</p>
              <Button
                full
                icon={<IconSpark />}
                disabled={busy}
                onClick={() => open(nextChapter.id, false)}
              >
                {t('story.start')}
              </Button>
            </div>
          </motion.section>
        )}

        <section className="chapter-list">
          <h3 className="h3 chapter-list__title">{tx(season?.title ?? { ar: '', en: '' })}</h3>
          {!season && <EmptyState>{t('common.loading')}</EmptyState>}
          {chapters.map((c) => (
            <button
              key={c.id}
              className={`chapter-row${c.unlocked ? '' : ' chapter-row--locked'}`}
              disabled={!c.unlocked || busy}
              onClick={() => open(c.id, c.isDone)}
            >
              <span className="chapter-row__num u-num">{c.index}</span>
              <span className="chapter-row__body">
                <span className="chapter-row__title">{tx(c.title)}</span>
                <span className="chapter-row__teaser caption subtle">
                  {c.unlocked ? tx(c.teaser) : t('story.locked')}
                </span>
              </span>
              <span className="chapter-row__state">
                {c.isDone ? <IconCheck size={15} /> : c.unlocked ? null : <IconLock size={14} />}
              </span>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
