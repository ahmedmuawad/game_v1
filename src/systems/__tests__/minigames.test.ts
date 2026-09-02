import { describe, expect, it } from 'vitest'
import {
  coinsForResult, comboMultiplier, judgeHit, seededShuffle, xpForResult, HIT_POINTS,
} from '../minigames'
import { getConfig } from '../config'

const cfg = getConfig()

describe('مكافأة العملات', () => {
  it('النتيجة الكاملة تدّي السقف', () => {
    expect(coinsForResult({ score: 10, max: 10 })).toBe(cfg.minigameMaxCoins)
  })

  it('الصفر يدّي الحد الأدنى — المحاولة نفسها ليها قيمة', () => {
    expect(coinsForResult({ score: 0, max: 10 })).toBe(cfg.minigameBaseCoins)
  })

  it('النص بين الحدّين', () => {
    const half = coinsForResult({ score: 5, max: 10 })
    expect(half).toBeGreaterThan(cfg.minigameBaseCoins)
    expect(half).toBeLessThan(cfg.minigameMaxCoins)
  })

  it('التطبيع بيسوّي بين ألعاب بمقاييس مختلفة', () => {
    // ذاكرة أقصاها 8، إيقاع أقصاه 120 — الأداء الكامل نفس المكافأة
    expect(coinsForResult({ score: 8, max: 8 })).toBe(coinsForResult({ score: 120, max: 120 }))
  })

  it('بيتحمّل نتيجة أعلى من الأقصى بلا انفجار', () => {
    expect(coinsForResult({ score: 99, max: 10 })).toBe(cfg.minigameMaxCoins)
  })

  it('بيتحمّل أقصى صفر', () => {
    expect(coinsForResult({ score: 0, max: 0 })).toBe(cfg.minigameBaseCoins)
  })

  it('النتيجة السالبة ما تنزلش تحت الحد الأدنى', () => {
    expect(coinsForResult({ score: -5, max: 10 })).toBe(cfg.minigameBaseCoins)
  })
})

describe('مكافأة الخبرة', () => {
  it('بتتناسب مع العملات ومش بتقل عن 5', () => {
    expect(xpForResult({ score: 0, max: 10 })).toBeGreaterThanOrEqual(5)
    expect(xpForResult({ score: 10, max: 10 })).toBeGreaterThan(xpForResult({ score: 0, max: 10 }))
  })
})

describe('مضاعف المتتالية', () => {
  it('واحد لأول نقرة', () => {
    expect(comboMultiplier(0)).toBe(1)
    expect(comboMultiplier(1)).toBe(1)
  })
  it('بيزيد بالتدريج', () => {
    expect(comboMultiplier(2)).toBe(1.25)
    expect(comboMultiplier(3)).toBe(1.5)
  })
  it('بيقف عند 5 — بلا سقف الاقتصاد بينكسر', () => {
    expect(comboMultiplier(100)).toBe(5)
    expect(comboMultiplier(17)).toBe(5)
  })
})

describe('تقييم النقرة', () => {
  it('في القلب = ممتاز', () => {
    expect(judgeHit(0)).toBe('perfect')
    expect(judgeHit(-89)).toBe('perfect')
  })
  it('قريب = حلو', () => {
    expect(judgeHit(150)).toBe('good')
    expect(judgeHit(-220)).toBe('good')
  })
  it('بعيد = فاتت', () => {
    expect(judgeHit(221)).toBe('miss')
    expect(judgeHit(-900)).toBe('miss')
  })
  it('النقاط مرتبة', () => {
    expect(HIT_POINTS.perfect).toBeGreaterThan(HIT_POINTS.good)
    expect(HIT_POINTS.good).toBeGreaterThan(HIT_POINTS.miss)
  })
})

describe('الخلط بالبذرة', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8]
  it('ثابت لنفس البذرة', () => {
    expect(seededShuffle(src, 'a')).toEqual(seededShuffle(src, 'a'))
  })
  it('مختلف لبذرة تانية', () => {
    expect(seededShuffle(src, 'a')).not.toEqual(seededShuffle(src, 'b'))
  })
  it('بيحافظ على كل العناصر', () => {
    expect([...seededShuffle(src, 'x')].sort((a, b) => a - b)).toEqual(src)
  })
  it('مابيغيّرش المصدر', () => {
    const copy = [...src]
    seededShuffle(src, 'z')
    expect(src).toEqual(copy)
  })
})
