import { afterEach, describe, expect, it } from 'vitest'
import {
  approxAgeFromBirthYear, bracketForAge, initialConsentFor, isPlausibleBirthYear,
  mayCreateAccount, maySyncData, runAgeGate,
} from '../age'
import { getConfig, hydrateConfig, resetConfig } from '@/systems/config'

const NOW = new Date('2026-09-01T12:00:00')

describe('بوابة العمر', () => {
  afterEach(() => { resetConfig() })

  it('السن التقريبي من سنة الميلاد', () => {
    expect(approxAgeFromBirthYear(2014, NOW)).toBe(12)
    expect(approxAgeFromBirthYear(2010, NOW)).toBe(16)
  })

  it('ترفض السنوات غير المعقولة', () => {
    expect(isPlausibleBirthYear(2030, NOW)).toBe(false) // في المستقبل
    expect(isPlausibleBirthYear(1800, NOW)).toBe(false) // أكبر من الحد
    expect(isPlausibleBirthYear(12.5, NOW)).toBe(false) // مش عدد صحيح
    expect(isPlausibleBirthYear(NaN, NOW)).toBe(false)
    expect(isPlausibleBirthYear(2014, NOW)).toBe(true)
  })

  it('تتحفّظ عند الحدّ بالظبط فتعتبره طفلًا', () => {
    // السن مشتقّ من السنة بس، فاللي «13» ممكن يكون 12 لسه
    expect(bracketForAge(13)).toBe('child')
    expect(bracketForAge(14)).toBe('teen')
    expect(bracketForAge(12)).toBe('child')
  })

  it('البوابة بترجّع موافقة مطلوبة للأطفال فقط', () => {
    const child = runAgeGate(2015, NOW) // ~11
    expect(child.bracket).toBe('child')
    expect(child.needsParentalConsent).toBe(true)

    const teen = runAgeGate(2010, NOW) // ~16
    expect(teen.bracket).toBe('teen')
    expect(teen.needsParentalConsent).toBe(false)
  })

  it('الإدخال الباطل يُعامَل كأنه يحتاج موافقة — لا يفتح الباب', () => {
    const bad = runAgeGate(2030, NOW)
    expect(bad.valid).toBe(false)
    expect(bad.bracket).toBeNull()
    expect(bad.needsParentalConsent).toBe(true)
  })

  it('الموافقة الابتدائية تتبع الفئة', () => {
    expect(initialConsentFor('child')).toBe('pending')
    expect(initialConsentFor('teen')).toBe('not_required')
  })
})

describe('بوابة الحساب مغلقة افتراضيًا', () => {
  afterEach(() => { resetConfig() })

  it('المراهقة تقدر تعمل حساب وتزامن', () => {
    expect(mayCreateAccount('teen', 'not_required')).toBe(true)
    expect(maySyncData('teen', 'not_required')).toBe(true)
  })

  it('الطفلة ممنوعة قبل الموافقة', () => {
    expect(mayCreateAccount('child', 'pending')).toBe(false)
    expect(maySyncData('child', 'pending')).toBe(false)
  })

  it('الطفلة مسموحة بعد الموافقة الموثّقة', () => {
    expect(mayCreateAccount('child', 'granted')).toBe(true)
    expect(maySyncData('child', 'granted')).toBe(true)
  })

  it('الفئة غير المعروفة ممنوعة — الغموض يُقرأ كمنع', () => {
    expect(mayCreateAccount(null, null)).toBe(false)
    expect(mayCreateAccount(null, 'granted')).toBe(false)
    expect(maySyncData(null, 'granted')).toBe(false)
    expect(mayCreateAccount('child', null)).toBe(false)
  })

  it('رفع سن الموافقة من الإعداد وحده يوسّع الحماية', () => {
    // سيناريو COPPA 2.0: الحماية تمتد لتحت 17 بتغيير قيمة واحدة
    hydrateConfig({ ...getConfig(), consentAgeMin: 17 })
    expect(runAgeGate(2010, NOW).bracket).toBe('child') // 16 سنة
    expect(runAgeGate(2010, NOW).needsParentalConsent).toBe(true)
    expect(runAgeGate(2007, NOW).bracket).toBe('teen') // 19 سنة
  })
})
