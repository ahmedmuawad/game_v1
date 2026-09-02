import { describe, expect, it } from 'vitest'
import { affordability, pickDailyShop, type ShopEntry } from '../shop'

const e = (id: string, over: Partial<ShopEntry> = {}): ShopEntry => ({
  id, category: 'top', rarity: 'common',
  price: { currency: 'coins', amount: 100 }, level: null, ...over,
})

const pool = Array.from({ length: 20 }, (_, i) => e(`i${i}`))

describe('اختيار اليوم', () => {
  it('ثابت خلال نفس اليوم', () => {
    const a = pickDailyShop(pool, [], 5, '2026-09-02')
    const b = pickDailyShop(pool, [], 5, '2026-09-02')
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })

  it('بيتغيّر مع اليوم', () => {
    const a = pickDailyShop(pool, [], 5, '2026-09-02')
    const b = pickDailyShop(pool, [], 5, '2026-09-03')
    expect(a.map((x) => x.id)).not.toEqual(b.map((x) => x.id))
  })

  it('بيرجّع العدد المطلوب بلا تكرار', () => {
    const got = pickDailyShop(pool, [], 5, '2026-09-02', 3)
    expect(got).toHaveLength(3)
    expect(new Set(got.map((x) => x.id)).size).toBe(3)
  })

  it('بيستبعد المملوك', () => {
    const owned = pool.slice(0, 17).map((x) => x.id)
    const got = pickDailyShop(pool, owned, 5, '2026-09-02', 3)
    expect(got).toHaveLength(3)
    for (const g of got) expect(owned).not.toContain(g.id)
  })

  it('بيستبعد المقفول بالمستوى — الترشيح ما يبقاش إحباط', () => {
    const locked = [e('a', { level: 9 }), e('b', { level: 9 }), e('c', { level: 1 })]
    const got = pickDailyShop(locked, [], 2, '2026-09-02', 3)
    expect(got.map((x) => x.id)).toEqual(['c'])
  })

  it('بيرجّع اللي فيه لو الباقي أقل من المطلوب', () => {
    expect(pickDailyShop([e('a'), e('b')], [], 5, '2026-09-02', 3)).toHaveLength(2)
  })

  it('بيرجّع فاضي لو كله مملوك', () => {
    expect(pickDailyShop(pool, pool.map((x) => x.id), 5, '2026-09-02')).toEqual([])
  })
})

describe('القدرة على الشراء', () => {
  const item = e('x', { price: { currency: 'coins', amount: 100 }, level: 3 })

  it('مملوكة', () => {
    expect(affordability(item, ['x'], 9, 999, 9)).toBe('owned')
  })
  it('مقفولة بالمستوى — الأسبقية على نقص الفلوس', () => {
    expect(affordability(item, [], 1, 0, 0)).toBe('locked')
  })
  it('الفلوس مش كافية', () => {
    expect(affordability(item, [], 5, 40, 999)).toBe('poor')
  })
  it('تمام', () => {
    expect(affordability(item, [], 5, 100, 0)).toBe('ok')
  })
  it('بيقرا محفظة الجواهر للأسعار بالجواهر', () => {
    const gemItem = e('g', { price: { currency: 'gems', amount: 5 } })
    expect(affordability(gemItem, [], 5, 0, 5)).toBe('ok')
    expect(affordability(gemItem, [], 5, 9999, 4)).toBe('poor')
  })
})
