import { createContext, useContext } from 'react'
import { strings, type StringKey } from './strings'
import { LOCALE_DIR, type Locale, type LocalizedText } from './types'

export * from './types'
export { strings, type StringKey }

export interface I18n {
  locale: Locale
  dir: 'rtl' | 'ltr'
  /** ترجمة مفتاح، مع استبدال اختياري للمتغيرات: t('x', { name: 'ليلى' }) → "أهلاً {name}" */
  t: (key: StringKey, vars?: Record<string, string | number>) => string
  /** ترجمة نص مرفق بالمحتوى (من ملفات JSON) */
  tx: (text: LocalizedText | undefined) => string
  /** تنسيق رقم بأرقام لاتينية دائمًا لسهولة المسح البصري */
  n: (value: number) => string
}

const FALLBACK: Locale = 'en'

export function createI18n(locale: Locale): I18n {
  const t = (key: StringKey, vars?: Record<string, string | number>): string => {
    const entry = strings[key] as LocalizedText | undefined
    if (!entry) {
      if (import.meta.env.DEV) console.warn(`[i18n] مفتاح ناقص: ${key}`)
      return key
    }
    let out = entry[locale] ?? entry[FALLBACK] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.replaceAll(`{${k}}`, String(v))
      }
    }
    return out
  }

  const tx = (text: LocalizedText | undefined): string => {
    if (!text) return ''
    return text[locale] ?? text[FALLBACK] ?? ''
  }

  const n = (value: number): string =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)

  return { locale, dir: LOCALE_DIR[locale], t, tx, n }
}

export const I18nContext = createContext<I18n>(createI18n('ar'))

export function useI18n(): I18n {
  return useContext(I18nContext)
}

/** يضبط سمات <html> ليعمل RTL وتبديل الخط بشكل صحيح. */
export function applyLocaleToDocument(locale: Locale): void {
  const el = document.documentElement
  el.lang = locale
  el.dir = LOCALE_DIR[locale]
}
