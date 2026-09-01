import { describe, expect, it } from 'vitest'
import { formatDuration, msToNextEnergy, regenEnergy } from '../energy'
import { energyMaxForLevel, getConfig } from '../config'

const MIN = 60_000

describe('تجدد الطاقة', () => {
  const cfg = getConfig()
  const interval = cfg.energyRegenMinutes * MIN

  it('لا يتجدد قبل مرور فترة كاملة', () => {
    const r = regenEnergy({ energy: 2, energyAt: 0 }, 1, interval - 1)
    expect(r.energy).toBe(2)
  })

  it('يمنح وحدة واحدة بعد فترة واحدة', () => {
    const r = regenEnergy({ energy: 2, energyAt: 0 }, 1, interval)
    expect(r.energy).toBe(3)
  })

  it('يحتفظ بالدقائق الجزئية بدل إهدارها', () => {
    const r = regenEnergy({ energy: 0, energyAt: 0 }, 1, interval + interval / 2)
    expect(r.energy).toBe(1)
    // العدّاد يتقدّم فترة واحدة فقط، فالنصف الباقي محفوظ
    expect(r.energyAt).toBe(interval)
  })

  it('لا يتجاوز السقف مهما طال الغياب', () => {
    const max = energyMaxForLevel(1)
    const r = regenEnergy({ energy: 0, energyAt: 0 }, 1, interval * 1000)
    expect(r.energy).toBe(max)
  })

  it('السقف يرتفع مع المستوى', () => {
    expect(energyMaxForLevel(6)).toBe(energyMaxForLevel(1) + 1)
    expect(energyMaxForLevel(11)).toBe(energyMaxForLevel(1) + 2)
  })

  it('يرجّع null للوقت المتبقي عند الامتلاء', () => {
    expect(msToNextEnergy({ energy: energyMaxForLevel(1), energyAt: 0 }, 1, 0)).toBeNull()
  })

  it('الوقت المتبقي يتناقص مع مرور الزمن', () => {
    const a = msToNextEnergy({ energy: 0, energyAt: 0 }, 1, 0)!
    const b = msToNextEnergy({ energy: 0, energyAt: 0 }, 1, MIN)!
    expect(b).toBeLessThan(a)
  })

  it('يقاوم رجوع ساعة الجهاز للخلف', () => {
    const r = regenEnergy({ energy: 3, energyAt: 10 * interval }, 1, 0)
    expect(r.energy).toBe(3)
  })

  it('تنسيق المدة', () => {
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })
})
