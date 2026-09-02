import { StrictMode, useEffect, useMemo, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nContext, applyLocaleToDocument, createI18n, useI18n } from '@/i18n'
import { ToastProvider } from '@/app/toast'
import { CelebrationHost } from '@/components/ui/Celebration'
import { setHapticsEnabled, haptic } from '@/app/haptics'
import { setSfxEnabled } from '@/app/sound'
import { useGame } from '@/state/store'
import { initAds } from '@/systems/ads'
import { initNative } from '@/app/native'
import { loadManifest, type AvatarManifest } from '@/content/manifest'
import { StoryHome } from '@/features/story/StoryHome'
import { StyleScreen } from '@/features/StyleScreen'
import { ShopScreen } from '@/features/shop/ShopScreen'
import { RoomScreen } from '@/features/room/RoomScreen'
import { PlayScreen } from '@/features/play/PlayScreen'
import { Onboarding } from '@/features/onboarding/Onboarding'
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

function App() {
  const [manifest, setManifest] = useState<AvatarManifest | null>(null)
  const [tab, setTab] = useState<TabId>('story')
  const boot = useGame((s) => s.boot)
  const onboarded = useGame((s) => s.onboarded)
  const settings = useGame((s) => s.settings)
  const locale = settings.locale

  const i18n = useMemo(() => createI18n(locale), [locale])

  useEffect(() => { applyLocaleToDocument(locale) }, [locale])
  useEffect(() => { setHapticsEnabled(settings.haptics) }, [settings.haptics])
  useEffect(() => { setSfxEnabled(settings.sfx) }, [settings.sfx])
  useEffect(() => {
    boot()
    void initNative()
    void initAds()
    loadManifest().then(setManifest).catch((e) => console.error('[assets]', e))
  }, [boot])

  // مبدّل اللغة بقى في شاشة الإعدادات — كان مربوطًا بمفتاح لوحة مفاتيح
  // يعني مستحيل الوصول له على الموبايل، وهو المنصّة الوحيدة للمنتج.

  /*
    الأونبوردنج بيتعرض بدل التطبيق لا فوقه: شريط التنقل والشاشات
    ماينفعش يبقوا موجودين في الشجرة وهو شغّال — أول لحظة في اللعبة
    لازم تبقى قرار واحد على الشاشة بلا مهارب.
  */
  if (!onboarded) {
    return (
      <I18nContext.Provider value={i18n}>
        <ToastProvider>
          <Onboarding manifest={manifest} />
          <CelebrationHost />
        </ToastProvider>
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={i18n}>
      <ToastProvider>
        <div className="app">
          {tab === 'story' && <StoryHome manifest={manifest} />}
          {tab === 'style' && <StyleScreen manifest={manifest} />}
          {tab === 'room' && <RoomScreen manifest={manifest} />}
          {tab === 'play' && <PlayScreen manifest={manifest} />}
          {tab === 'shop' && <ShopScreen manifest={manifest} />}
          <NavBar tab={tab} onChange={setTab} />
          <CelebrationHost />
        </div>
      </ToastProvider>
    </I18nContext.Provider>
  )
}

/*
  الجذر بيتخزّن على `window` بدل ما يتعمل من جديد كل مرة.

  التحديث الساخن بيعيد تنفيذ الموديول ده، و`createRoot` على نفس العنصر
  مرتين بيسيب جذرين بيتنازعوا على نفس الشجرة — النتيجة أعطال
  `removeChild` متكررة وواجهة بتتجمّد أثناء التطوير. البناء الإنتاجي
  بينفّذ الموديول مرة واحدة فالحارس ده بلا أثر عليه.
*/
declare global {
  interface Window { __liviRoot?: ReturnType<typeof createRoot> }
}

const container = document.getElementById('root')!
const root = window.__liviRoot ?? createRoot(container)
window.__liviRoot = root
root.render(<StrictMode><App /></StrictMode>)
