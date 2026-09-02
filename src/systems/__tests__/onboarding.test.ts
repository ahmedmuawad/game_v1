import { describe, expect, it } from 'vitest'
import { roomForVibe, sanitizeName, starterGiftFor, VIBES, type GiftCandidate } from '../onboarding'
import { createInitialState } from '@/state/defaults'
import { SURFACES_BY_ID } from '@/content/room'

const g = (id: string, over: Partial<GiftCandidate> = {}): GiftCandidate => ({
  id, category: 'top', tags: ['soft'], rarity: 'common',
  price: { currency: 'coins', amount: 100 }, level: null, ...over,
})

describe('غرفة الفايب', () => {
  it('كل فايب بيدّي حوائط وأرضيات موجودة فعلًا في الكتالوج', () => {
    const base = createInitialState().room
    for (const v of VIBES) {
      const r = roomForVibe(v, base)
      expect(SURFACES_BY_ID[r.wall], `wall ${r.wall} للفايب ${v}`).toBeDefined()
      expect(SURFACES_BY_ID[r.floor], `floor ${r.floor} للفايب ${v}`).toBeDefined()
    }
  })

  it('بيحافظ على باقي الغرفة', () => {
    const base = createInitialState().room
    expect(roomForVibe('bold', base).slots).toEqual(base.slots)
  })

  it('كل فايب بيدّي شكل مختلف', () => {
    const base = createInitialState().room
    const walls = VIBES.map((v) => roomForVibe(v, base).wall)
    expect(new Set(walls).size).toBe(VIBES.length)
  })
})

describe('هدية البداية', () => {
  it('بتطابق وسم الفايب', () => {
    const pool = [g('a', { tags: ['bold'] }), g('b', { tags: ['soft'] })]
    expect(starterGiftFor('soft', pool, [])?.id).toBe('b')
    expect(starterGiftFor('bold', pool, [])?.id).toBe('a')
  })

  it('بتستبعد المملوك', () => {
    const pool = [g('a'), g('b')]
    expect(starterGiftFor('soft', pool, ['a'])?.id).toBe('b')
  })

  it('بتستبعد المقفول بالمستوى — هدية ترحيب مقفولة وعد فاضي', () => {
    const pool = [g('a', { level: 5 }), g('b')]
    expect(starterGiftFor('soft', pool, [])?.id).toBe('b')
  })

  it('بتفضّل الفستان ثم القطعة العلوية — الحذاء بالكاد يبان', () => {
    const pool = [g('sh', { category: 'shoes' }), g('tp', { category: 'top' }), g('dr', { category: 'dress' })]
    expect(starterGiftFor('soft', pool, [])?.id).toBe('dr')
    expect(starterGiftFor('soft', pool.filter((x) => x.id !== 'dr'), [])?.id).toBe('tp')
  })

  it('ثابتة — نفس الفايب يدّي نفس الهدية لكل اللاعبات', () => {
    const pool = [g('z'), g('a'), g('m')]
    const first = starterGiftFor('soft', pool, [])?.id
    for (let i = 0; i < 5; i++) expect(starterGiftFor('soft', pool, [])?.id).toBe(first)
  })

  it('بترجّع null لو مفيش مطابقة', () => {
    expect(starterGiftFor('dreamy', [g('a', { tags: ['bold'] })], [])).toBeNull()
  })
})

describe('تنظيف الاسم', () => {
  it('بيشيل المسافات الزايدة', () => {
    expect(sanitizeName('  ليلى   حسن ')).toBe('ليلى حسن')
  })
  it('بيقبل عربي وإنجليزي', () => {
    expect(sanitizeName('Mariam')).toBe('Mariam')
    expect(sanitizeName('نور')).toBe('نور')
  })
  it('بيرفض الفاضي', () => {
    expect(sanitizeName('   ')).toBeNull()
    expect(sanitizeName('')).toBeNull()
  })
  it('بيرفض الطويل جدًا', () => {
    expect(sanitizeName('a'.repeat(17))).toBeNull()
    expect(sanitizeName('a'.repeat(16))).toBe('a'.repeat(16))
  })
  it('بيرفض محارف الحقن في العرض', () => {
    expect(sanitizeName('<script>')).toBeNull()
    expect(sanitizeName('a/b')).toBeNull()
    expect(sanitizeName('a@b')).toBeNull()
  })
})
