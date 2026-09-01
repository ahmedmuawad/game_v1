/** اللغات المدعومة. توسيع هذا النوع يجبر المترجم على كشف كل نص ناقص. */
export type Locale = 'ar' | 'en'

export const LOCALES: Locale[] = ['ar', 'en']

export const LOCALE_DIR: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
}

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
}

/**
 * نص مترجم مرفق بالمحتوى (قصص، عناصر، تحديات).
 * كل حقل نصي يواجه اللاعب في ملفات المحتوى يجب أن يكون بهذا الشكل.
 */
export type LocalizedText = Record<Locale, string>

export function pickText(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? ''
}
