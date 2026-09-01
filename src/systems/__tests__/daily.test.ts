import { describe, expect, it } from 'vitest'
import { advanceMissions, dailyGiftAmount, freezeAvailable, generateMissions, rollDay } from '../daily'
import { getConfig } from '../config'
import { todayKey, weekKey } from '@/state/defaults'
import type { DailyState } from '@/state/types'

function state(patch: Partial<DailyState> = {}): DailyState {
  return {
    day: '2026-09-01', streak: 4, freezeUsedWeek: null, giftClaimed: true,
    missions: generateMissions('2026-09-01'), momentSeen: 'x', adsWatched: 3,
    ...patch,
  }
}

describe('الحلقة اليومية', () => {
  it('لا يتغيّر شيء في نفس اليوم', () => {
    const s = state({ day: todayKey() })
    expect(rollDay(s)).toBe(s)
  })

  it('اليوم التالي يزيد السلسلة ويعيد الضبط', () => {
    const s = state({ day: '2026-09-01' })
    const r = rollDay(s, new Date('2026-09-02T09:00:00'))
    expect(r.streak).toBe(5)
    expect(r.giftClaimed).toBe(false)
    expect(r.adsWatched).toBe(0)
    expect(r.momentSeen).toBeNull()
  })

  it('انقطاع يوم واحد: التجميدة المجانية تحفظ السلسلة', () => {
    const s = state({ day: '2026-09-01', streak: 10, freezeUsedWeek: null })
    const r = rollDay(s, new Date('2026-09-03T09:00:00'))
    expect(r.streak).toBe(11)
    expect(r.freezeUsedWeek).toBe(weekKey(new Date('2026-09-03T09:00:00')))
  })

  it('التجميدة مرة واحدة أسبوعيًا فقط', () => {
    const now = new Date('2026-09-03T09:00:00')
    const s = state({ day: '2026-09-01', streak: 10, freezeUsedWeek: weekKey(now) })
    const r = rollDay(s, now)
    expect(r.streak).toBe(5) // تُقسَّم لا تُصفَّر
  })

  it('الانقطاع الطويل يُنصّف ولا يُصفّر أبدًا', () => {
    const cfg = getConfig()
    const s = state({ day: '2026-09-01', streak: 20 })
    const r = rollDay(s, new Date('2026-09-20T09:00:00'))
    expect(r.streak).toBe(Math.floor(20 / cfg.streakBreakDivisor))
    expect(r.streak).toBeGreaterThan(0)
  })

  it('السلسلة لا تنزل تحت 1', () => {
    const s = state({ day: '2026-09-01', streak: 1 })
    const r = rollDay(s, new Date('2026-09-20T09:00:00'))
    expect(r.streak).toBe(1)
  })

  it('المهام حتمية لنفس اليوم', () => {
    expect(generateMissions('2026-09-05')).toEqual(generateMissions('2026-09-05'))
  })

  it('عدد المهام يطابق الإعداد', () => {
    expect(generateMissions('2026-09-05')).toHaveLength(getConfig().dailyMissionCount)
  })

  it('تقدّم المهمة محصور بالهدف', () => {
    const m = [{ id: 'a', kind: 'play_minigame' as const, target: 2, progress: 0,
                 reward: { coins: 10 }, claimed: false }]
    expect(advanceMissions(m, 'play_minigame', 5)[0].progress).toBe(2)
  })

  it('نوع مختلف لا يتأثر', () => {
    const m = [{ id: 'a', kind: 'read_chapter' as const, target: 1, progress: 0,
                 reward: { coins: 10 }, claimed: false }]
    expect(advanceMissions(m, 'play_minigame')).toBe(m)
  })

  it('هدية اليوم تدور على 7 أيام', () => {
    const cfg = getConfig()
    expect(dailyGiftAmount(1)).toBe(cfg.dailyGiftCoins[0])
    expect(dailyGiftAmount(8)).toBe(cfg.dailyGiftCoins[0])
    expect(dailyGiftAmount(7)).toBe(cfg.dailyGiftCoins[6])
  })

  it('توفّر التجميدة يُقرأ من الأسبوع', () => {
    const now = new Date('2026-09-03T09:00:00')
    expect(freezeAvailable(state({ freezeUsedWeek: null }), now)).toBe(true)
    expect(freezeAvailable(state({ freezeUsedWeek: weekKey(now) }), now)).toBe(false)
  })
})
