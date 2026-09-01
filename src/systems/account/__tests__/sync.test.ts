import { describe, expect, it } from 'vitest'
import { mergeStates, type SyncEnvelope } from '../sync'
import { createInitialState, SCHEMA_VERSION } from '@/state/defaults'
import type { PlayerState } from '@/state/types'

function env(patch: Partial<PlayerState>, updatedAt: number, schema = SCHEMA_VERSION): SyncEnvelope {
  return { state: { ...createInitialState(), ...patch }, updatedAt, schema }
}

describe('دمج المزامنة — الأساسيات', () => {
  it('مفيش سحابة: نرفع المحلي', () => {
    const r = mergeStates(env({ coins: 300 }, 100), null, SCHEMA_VERSION)
    expect(r.reason).toBe('local_only')
    expect(r.writeCloud).toBe(true)
    expect(r.writeLocal).toBe(false)
    expect(r.merged?.coins).toBe(300)
  })

  it('مفيش محلي: ننزّل السحابي', () => {
    const r = mergeStates(null, env({ coins: 500 }, 100), SCHEMA_VERSION)
    expect(r.reason).toBe('cloud_only')
    expect(r.writeLocal).toBe(true)
    expect(r.merged?.coins).toBe(500)
  })

  it('نفس اللحظة: مفيش شغل', () => {
    const r = mergeStates(env({ coins: 1 }, 100), env({ coins: 2 }, 100), SCHEMA_VERSION)
    expect(r.reason).toBe('identical')
    expect(r.writeLocal).toBe(false)
    expect(r.writeCloud).toBe(false)
  })

  it('سحابة بمخطط أحدث: نرفض الدمج بدل ما نبوّظ', () => {
    const r = mergeStates(env({}, 100), env({}, 200, SCHEMA_VERSION + 1), SCHEMA_VERSION)
    expect(r.reason).toBe('cloud_schema_ahead')
    expect(r.merged).toBeNull()
    expect(r.writeLocal).toBe(false)
    expect(r.writeCloud).toBe(false)
  })
})

describe('دمج المزامنة — ما بناخدش حاجة من اللاعبة', () => {
  it('العناصر المملوكة بتتجمع من الطرفين', () => {
    const local = env({ owned: ['a', 'b'] }, 200)
    const cloud = env({ owned: ['b', 'c'] }, 100)
    const r = mergeStates(local, cloud, SCHEMA_VERSION)
    expect(r.merged?.owned.sort()).toEqual(['a', 'b', 'c'])
  })

  it('الفصول المكتملة بتتجمع مهما كان الأحدث', () => {
    const local = env({ story: { ...createInitialState().story, completed: ['c1'] } }, 100)
    const cloud = env({ story: { ...createInitialState().story, completed: ['c2', 'c3'] } }, 200)
    const r = mergeStates(local, cloud, SCHEMA_VERSION)
    expect(r.merged?.story.completed.sort()).toEqual(['c1', 'c2', 'c3'])
  })

  it('المستوى والخبرة بياخدوا الأكبر', () => {
    const r = mergeStates(env({ level: 3, xp: 50 }, 200), env({ level: 7, xp: 900 }, 100), SCHEMA_VERSION)
    expect(r.merged?.level).toBe(7)
    expect(r.merged?.xp).toBe(900)
  })

  it('العملات بتاخد الأكبر — لصالح اللاعبة على التعارض', () => {
    const r = mergeStates(env({ coins: 100, gems: 2 }, 200), env({ coins: 900, gems: 9 }, 100), SCHEMA_VERSION)
    expect(r.merged?.coins).toBe(900)
    expect(r.merged?.gems).toBe(9)
  })

  it('أفضل النتائج بتاخد الأعلى لكل لعبة', () => {
    const r = mergeStates(
      env({ bestScores: { g1: 10, g2: 99 } }, 200),
      env({ bestScores: { g1: 80, g3: 5 } }, 100),
      SCHEMA_VERSION,
    )
    expect(r.merged?.bestScores).toEqual({ g1: 80, g2: 99, g3: 5 })
  })

  it('اللعب أوفلاين على جهاز تاني مايضيعش', () => {
    // الجهاز أ: أقدم زمنيًا لكنه خلّص فصلين واشترى قطعة
    const older = env({
      owned: ['tee', 'skirt'], level: 5,
      story: { ...createInitialState().story, completed: ['c1', 'c2'] },
    }, 100)
    // الجهاز ب: أحدث لكنه لسه في البداية
    const newer = env({ owned: ['tee'], level: 2 }, 500)

    const r = mergeStates(newer, older, SCHEMA_VERSION)
    expect(r.reason).toBe('local_newer')
    expect(r.merged?.owned).toContain('skirt')
    expect(r.merged?.level).toBe(5)
    expect(r.merged?.story.completed).toEqual(['c1', 'c2'])
    expect(r.writeLocal).toBe(true)
    expect(r.writeCloud).toBe(true)
  })
})

describe('دمج المزامنة — الحلقة اليومية', () => {
  const base = createInitialState()
  const daily = (patch: Partial<PlayerState['daily']>) => ({ ...base.daily, ...patch })

  it('علم الاستلام بيتجمع بـOR — منع استلام مرتين', () => {
    const l = env({ daily: daily({ day: '2026-09-01', giftClaimed: true }) }, 200)
    const c = env({ daily: daily({ day: '2026-09-01', giftClaimed: false }) }, 100)
    const r = mergeStates(l, c, SCHEMA_VERSION)
    expect(r.merged?.daily.giftClaimed).toBe(true)
  })

  it('تقدّم المهام بياخد الأكبر والاستلام بـOR', () => {
    const mk = (progress: number, claimed: boolean) => [{
      id: 'm_read1', kind: 'read_chapter' as const, target: 2,
      progress, reward: { coins: 10 }, claimed,
    }]
    const l = env({ daily: daily({ day: '2026-09-01', missions: mk(1, false) }) }, 200)
    const c = env({ daily: daily({ day: '2026-09-01', missions: mk(2, true) }) }, 100)
    const r = mergeStates(l, c, SCHEMA_VERSION)
    expect(r.merged?.daily.missions[0].progress).toBe(2)
    expect(r.merged?.daily.missions[0].claimed).toBe(true)
  })

  it('يوم مختلف: الأحدث تاريخًا يكسب والسلسلة ما تقلّش', () => {
    const l = env({ daily: daily({ day: '2026-09-03', streak: 2 }) }, 200)
    const c = env({ daily: daily({ day: '2026-09-01', streak: 9 }) }, 100)
    const r = mergeStates(l, c, SCHEMA_VERSION)
    expect(r.merged?.daily.day).toBe('2026-09-03')
    expect(r.merged?.daily.streak).toBe(9)
  })
})
