import { StrictMode, useEffect, useMemo, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nContext, applyLocaleToDocument, createI18n, useI18n } from '@/i18n'
import { ToastProvider } from '@/app/toast'
import { setHapticsEnabled, haptic } from '@/app/haptics'
import { useGame } from '@/state/store'
import { initAds } from '@/systems/ads'
import { initNative } from '@/app/native'
import { loadManifest, type AvatarManifest } from '@/content/manifest'
import { StoryHome } from '@/features/story/StoryHome'
import { StyleScreen } from '@/features/StyleScreen'
import { IconStory, IconRoom, IconStyle, IconPlay, IconShop } from '@/app/icons'
import '@/design/global.css'
import '@/app/nav.css'

type TabId = 'story' | 'room' | 'style' | 'play' | 'shop'

const TABS: { id: TabId; icon: (p: { active?: boolean }) => ReactElement; key: string }[] = [
  { id: 'story', icon: IconStory, key: 'nav.story' },
  { id: 'room',  icon: IconRoom,  key: 'nav.room' },
  { id: 'style', icon: IconStyle, key: 'nav.style' },
  { id: 'play',  icon: IconPlay,  key: 'nav.play' },
  { id: 'shop',  icon: IconShop,  key: 'nav.shop' },
]

function NavBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  const { t } = useI18n()
  return (
    <nav className="navbar">
      {TABS.map(({ id, icon: Icon, key }) => (
        <button
          key={id}
          className="navbtn"
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => { onChange(id); haptic('select') }}
        >
          {tab === id && <span className="navbtn__glow" />}
          <Icon active={tab === id} />
          <span className="navbtn__label">{t(key as 'nav.story')}</span>
        </button>
      ))}
    </nav>
  )
}

function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useI18n()
  return (
    <div className="screen">
      <div className="topbar"><h1 className="h3">{t(titleKey as 'nav.room')}</h1></div>
      <div className="empty body-sm">{t('common.soon')}</div>
    </div>
  )
}

function App() {
  const [manifest, setManifest] = useState<AvatarManifest | null>(null)
  const [tab, setTab] = useState<TabId>('story')
  const boot = useGame((s) => s.boot)
  const settings = useGame((s) => s.settings)
  const locale = settings.locale

  const i18n = useMemo(() => createI18n(locale), [locale])

  useEffect(() => { applyLocaleToDocument(locale) }, [locale])
  useEffect(() => { setHapticsEnabled(settings.haptics) }, [settings.haptics])
  useEffect(() => {
    boot()
    void initNative()
    void initAds()
    loadManifest().then(setManifest).catch((e) => console.error('[assets]', e))
  }, [boot])

  // مبدّل اللغة بقى في شاشة الإعدادات — كان مربوطًا بمفتاح لوحة مفاتيح
  // يعني مستحيل الوصول له على الموبايل، وهو المنصّة الوحيدة للمنتج.

  return (
    <I18nContext.Provider value={i18n}>
      <ToastProvider>
        <div className="app">
          {tab === 'story' && <StoryHome manifest={manifest} />}
          {tab === 'style' && <StyleScreen manifest={manifest} />}
          {tab === 'room' && <Placeholder titleKey="nav.room" />}
          {tab === 'play' && <Placeholder titleKey="nav.play" />}
          {tab === 'shop' && <Placeholder titleKey="nav.shop" />}
          <NavBar tab={tab} onChange={setTab} />
        </div>
      </ToastProvider>
    </I18nContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
