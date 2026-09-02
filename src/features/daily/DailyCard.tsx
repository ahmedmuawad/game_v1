import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { haptic } from '@/app/haptics'
import { celebrate } from '@/components/ui/Celebration'
import { dailyGiftAmount, freezeAvailable } from '@/systems/daily'
import { Button, CoinIcon, ProgressBar } from '@/components/ui'
import { IconCheck, IconFlame, IconGift } from '@/app/icons'
import type { DailyMission } from '@/state/types'
import './daily.css'

/**
 * واجهة الحلقة اليومية.
 *
 * المنطق كله كان جاهزًا ومختبَرًا في `systems/daily.ts` والمخزن، لكنه
 * كان غايب تمامًا عن الشاشة — يعني أقوى محرك عودة يومي كان معطّلًا
 * عمليًا (QUALITY_REVIEW.md §6). المكوّن ده بيوصّل الموجود بالشاشة
 * ومش بيحسب أي منطق لعب بنفسه (قاعدة #3).
 */
export function DailyCard() {
  const { t, n } = useI18n()

  // محدّدات دقيقة بدل `useGame()` كامل عشان ما نعيدش الرسم بلا داعٍ
  const daily = useGame((s) => s.daily)
  const claimDailyGift = useGame((s) => s.claimDailyGift)
  const claimMission = useGame((s) => s.claimMission)

  const giftAmount = dailyGiftAmount(Math.max(1, daily.streak))
  const allDone = daily.giftClaimed && daily.missions.every((m) => m.claimed)

  /*
    «سلسلتك في أمان» تطمين معناه إن التجميدة هتحمي حاجة قائمة، فمالوش
    لازمة في أول يوم — بيبقى ضوضاء. في الحالة دي نشجّع على البناء بدل
    الطمأنة على لا شيء.
  */
  const note = daily.streak >= 2 && freezeAvailable(daily)
    ? t('daily.streakSafe')
    : t('daily.streakGrow')

  /*
    الاحتفال بدل الـtoast: لحظة الكسب كانت بتعدّي كشريط رمادي في ركن
    الشاشة — نفس شكل رسالة «الفلوس مش كافية» بالظبط. الفرق بين الكسب
    والخسارة كان لونًا صغيرًا.
  */
  function onClaimGift() {
    const amount = claimDailyGift()
    if (amount <= 0) return
    haptic('success')
    celebrate({ coins: amount, title: t('daily.reward') })
  }

  function onClaimMission(m: DailyMission) {
    const res = claimMission(m.id)
    if (!res) return
    haptic('success')
    celebrate({
      coins: res.coins, gems: res.gems, levels: res.levelsGained,
      title: t('daily.missions'),
    })
  }

  return (
    <motion.section
      className="card daily"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="daily__head">
        <span className="daily__flame" aria-hidden="true"><IconFlame size={19} /></span>
        <div className="daily__streak">
          <strong className="daily__streak-num u-num">
            {n(daily.streak)} <span className="daily__streak-unit">{t('daily.days')}</span>
          </strong>
          <span className="caption subtle">{t('daily.streak')}</span>
        </div>
        <span className="daily__head-note caption subtle">{note}</span>
      </header>

      {/* ===== هدية اليوم ===== */}
      <div className={`daily__gift${daily.giftClaimed ? ' daily__gift--done' : ''}`}>
        <span className="daily__gift-icon" aria-hidden="true"><IconGift size={22} /></span>
        <div className="daily__gift-body">
          <span className="daily__gift-title">{t('daily.reward')}</span>
          <span className="caption subtle">
            {daily.giftClaimed ? t('daily.comeBack') : t('daily.giftReady')}
          </span>
        </div>
        {daily.giftClaimed ? (
          <span className="daily__done" aria-label={t('daily.claimed')}><IconCheck size={15} /></span>
        ) : (
          <Button size="sm" onClick={onClaimGift}>
            <span className="daily__gift-amount u-num">
              <CoinIcon size={14} />{n(giftAmount)}
            </span>
          </Button>
        )}
      </div>

      {/* ===== مهام اليوم ===== */}
      <h4 className="daily__section caption subtle">{t('daily.missions')}</h4>
      <ul className="daily__missions">
        {daily.missions.map((m) => {
          const ready = m.progress >= m.target && !m.claimed
          return (
            <li key={m.id} className={`daily__mission${m.claimed ? ' daily__mission--done' : ''}`}>
              <div className="daily__mission-top">
                <span className="daily__mission-label body-sm">
                  {t(`daily.m.${m.kind}` as 'daily.m.read_chapter', { n: n(m.target) })}
                </span>
                {m.claimed ? (
                  <span className="daily__done" aria-label={t('daily.claimed')}><IconCheck size={14} /></span>
                ) : ready ? (
                  <Button size="sm" variant="gold" onClick={() => onClaimMission(m)}>
                    {t('daily.claim')}
                  </Button>
                ) : (
                  <span className="daily__mission-count caption subtle u-num">
                    {n(m.progress)}/{n(m.target)}
                  </span>
                )}
              </div>
              {!m.claimed && (
                <ProgressBar
                  value={m.target > 0 ? m.progress / m.target : 0}
                  tone={ready ? 'gold' : 'primary'}
                />
              )}
            </li>
          )
        })}
      </ul>

      {allDone && <p className="daily__alldone body-sm">{t('daily.allDone')}</p>}
    </motion.section>
  )
}
