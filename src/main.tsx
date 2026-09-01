import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nContext, applyLocaleToDocument, createI18n, type Locale } from '@/i18n'
import { ToastProvider } from '@/app/toast'
import { setHapticsEnabled } from '@/app/haptics'
import { useGame } from '@/state/store'
import { initAds } from '@/systems/ads'
import { loadManifest, type AvatarManifest } from '@/content/manifest'
import { StyleScreen } from '@/features/StyleScreen'
import '@/design/global.css'
import '@/app/nav.css'

function App() {
  const [locale, setLocale] = useState<Locale>('ar')
  const [manifest, setManifest] = useState<AvatarManifest | null>(null)
  const boot = useGame((s) => s.boot)
  const settings = useGame((s) => s.settings)

  const i18n = useMemo(() => createI18n(locale), [locale])

  useEffect(() => {
    applyLocaleToDocument(locale)
  }, [locale])

  useEffect(() => {
    boot()
    void initAds()
    loadManifest()
      .then(setManifest)
      .catch((e) => console.error('[assets] تعذّر تحميل الأصول', e))
  }, [boot])

  useEffect(() => {
    setHapticsEnabled(settings.haptics)
  }, [settings.haptics])

  // مبدّل لغة مؤقت حتى تُبنى شاشة الإعدادات
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'l') setLocale((l) => (l === 'ar' ? 'en' : 'ar'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <I18nContext.Provider value={i18n}>
      <ToastProvider>
        <div className="app">
          <StyleScreen manifest={manifest} />
        </div>
      </ToastProvider>
    </I18nContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
