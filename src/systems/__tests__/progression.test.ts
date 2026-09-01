import { describe, expect, it } from 'vitest'
import { applyXp, levelProgress } from '../progression'
import { getConfig, xpForLevel } from '../config'

describe('التقدّم', () => {
  it('يتراكم بلا ترقٍّ تحت العتبة', () => {
    const r = applyXp(1, 0, xpForLevel(1) - 1)
    expect(r.level).toBe(1)
    expect(r.levelsGained).toBe(0)
  })

  it('يرقّي عند بلوغ العتبة بالضبط', () => {
    const r = applyXp(1, 0, xpForLevel(1))
    expect(r.level).toBe(2)
    expect(r.xp).toBe(0)
  })

  it('يعالج ترقّيات متتالية من دفعة واحدة', () => {
    const need = xpForLevel(1) + xpForLevel(2) + xpForLevel(3)
    const r = applyXp(1, 0, need)
    expect(r.level).toBe(4)
    expect(r.levelsGained).toBe(3)
  })

  it('يمنح جيمز لكل مستوى', () => {
    const cfg = getConfig()
    const r = applyXp(1, 0, xpForLevel(1) + xpForLevel(2))
    expect(r.gemsAwarded).toBe(2 * cfg.gemsPerLevelUp)
  })

  it('يتوقف عند أقصى مستوى', () => {
    const cfg = getConfig()
    const r = applyXp(cfg.maxLevel, 0, 10_000_000)
    expect(r.level).toBe(cfg.maxLevel)
    expect(r.xp).toBe(0)
  })

  it('يتجاهل الخبرة السالبة', () => {
    const r = applyXp(3, 50, -100)
    expect(r.xp).toBe(50)
    expect(r.level).toBe(3)
  })

  it('نسبة التقدّم بين 0 و 1', () => {
    expect(levelProgress(1, 0)).toBe(0)
    expect(levelProgress(1, xpForLevel(1))).toBe(1)
    expect(levelProgress(1, xpForLevel(1) / 2)).toBeCloseTo(0.5, 5)
  })

  it('منحنى الخبرة تصاعدي', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(9))
  })
})
