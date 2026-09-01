import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { useToast } from '@/app/toast'
import { haptic } from '@/app/haptics'
import { AvatarView } from '@/components/avatar/AvatarView'
import {
  assetUrl, bodyKey, garmentsByCategory, hairKey, viewOf,
  type AvatarManifest, type GarmentLayer,
} from '@/content/manifest'
import { CurrencyPill, RarityBadge, Tabs } from '@/components/ui'
import { IconCheck, IconLock } from '@/app/icons'
import './style-screen.css'

type GarmentTab = 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'
type Tab = 'skin' | 'hair' | GarmentTab

/**
 * ألوان عيّنات الشعر في المنتقي.
 * قيم عرض فقط — القيم الحقيقية للتصيير في `tools/avatar/wardrobe.py`.
 * هنا نستخدم نسخة أفتح لأن اللون الخطي الداكن يبان أسود على شاشة صغيرة.
 */
const HAIR_SWATCH: Record<string, string> = {
  black: '#1E1922', espresso: '#3A2419', chestnut: '#6B3F26', caramel: '#A8703C',
  honey: '#D6A257', platinum: '#E4DCD1', auburn: '#9B3B2A', rose: '#E77398',
  lilac: '#A48BE0', mint: '#6FCFB0',
}

export function StyleScreen({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, tx, n } = useI18n()
  const { show: toast } = useToast()
  const [tab, setTab] = useState<Tab>('top')

  const avatar = useGame((s) => s.avatar)
  const owned = useGame((s) => s.owned)
  const coins = useGame((s) => s.coins)
  const gems = useGame((s) => s.gems)
  const level = useGame((s) => s.level)
  const wear = useGame((s) => s.wear)
  const buyItem = useGame((s) => s.buyItem)
  const setAvatarPart = useGame((s) => s.setAvatarPart)

  const v = manifest ? viewOf(manifest) : null
  const bodySrc = v?.body[bodyKey(avatar.skin, avatar.eyes)]?.src
  const wornSrcs = useMemo(() => {
    if (!v) return [] as string[]
    const slots = avatar.worn.dress ? ['dress'] : ['bottom', 'top']
    return slots
      .map((sl) => avatar.worn[sl as 'top'])
      .filter(Boolean)
      .map((id) => v.garments[id as string]?.src)
      .filter((x): x is string => Boolean(x))
  }, [v, avatar.worn])

  // التبويبات الفارغة تُخفى: تبويب بلا عناصر يبان كعطل لا كفئة قادمة
  const tabs = useMemo(() => {
    const garmentCats: { id: GarmentTab; label: string }[] = [
      { id: 'top', label: t('style.cat.top') },
      { id: 'bottom', label: t('style.cat.bottom') },
      { id: 'dress', label: t('style.cat.dress') },
      { id: 'shoes', label: t('style.cat.shoes') },
      { id: 'accessory', label: t('style.cat.acc') },
    ]
    const garmentTabs: { id: Tab; label: string }[] =
      garmentCats.filter((x) => !v || garmentsByCategory(v, x.id).length > 0)
    return [
      ...garmentTabs,
      { id: 'hair' as Tab, label: t('style.cat.hair') },
      { id: 'skin' as Tab, label: t('style.skin') },
    ]
  }, [t, v])

  // لو التبويب الحالي اختفى (كتالوج مختلف)، ارجع لأول تبويب متاح
  useEffect(() => {
    if (tabs.length && !tabs.some((x) => x.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  function handleGarment(g: GarmentLayer & { id: string }) {
    if (owned.includes(g.id)) {
      const slot = g.category as 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'
      wear(slot, avatar.worn[slot] === g.id ? undefined : g.id)
      haptic('select')
      return
    }
    if (g.level && level < g.level) {
      toast(t('common.locked'), 'warn')
      haptic('warning')
      return
    }
    if (buyItem(g.id)) {
      wear(g.category as 'top', g.id)
      toast(t('econ.purchased'), 'good')
      haptic('success')
    } else {
      toast(t('econ.notEnough'), 'bad')
      haptic('error')
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <CurrencyPill kind="coins" value={n(coins)} />
        <CurrencyPill kind="gems" value={n(gems)} />
        <span className="topbar__spacer" />
        <h1 className="h3">{t('style.title')}</h1>
      </div>

      <div className="style__stage">
        <div className="style__glow" />
        <AvatarView config={avatar} manifest={manifest} height={296} crop="full" />
      </div>

      <div className="style__picker">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        <div className="style__grid">
          {tab === 'skin' && manifest &&
            Object.entries(manifest.skinTones).map(([key, meta]) => {
              const on = avatar.skin === key
              // بلاطة بلا طبقة تبان كعطل — تُخفى بدل عرضها فاضية
              const src = v?.body[bodyKey(key, avatar.eyes)]?.src
              if (!src) return null
              return (
                <motion.button
                  key={key}
                  className={`tile${on ? ' tile--on' : ''}`}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { setAvatarPart('skin', key); haptic('select') }}
                  aria-label={tx(meta.name)}
                >
                  <img className="tile__thumb tile__thumb--head" src={assetUrl(src)} alt="" />
                  {on && <span className="tile__check"><IconCheck size={13} /></span>}
                </motion.button>
              )
            })}

          {/*
            الشعر يُختار على خطوتين: التسريحة ثم اللون.
            العرض المسطّح لكل التركيبات (6 × 10 = 60 بلاطة) بيحوّل
            القرار البسيط لبحث في شبكة، وبيخبّي إن اللون والتسريحة
            بُعدان مستقلان.
          */}
          {tab === 'hair' && manifest && (
            <>
              {Object.keys(manifest.hairStyles).map((style) => {
                const layer = v?.hair[hairKey(style, avatar.hairColor)]
                            ?? v?.hair[hairKey(style, Object.keys(manifest.hairColors)[0])]
                if (!layer) return null
                const on = avatar.hairStyle === style
                return (
                  <motion.button
                    key={style}
                    className={`tile${on ? ' tile--on' : ''}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { setAvatarPart('hairStyle', style); haptic('select') }}
                    aria-label={tx(manifest.hairStyles[style].name)}
                  >
                    {/*
                      المصغّرة تُركَّب فوق الإطلالة الحالية لا فوق الجسم وحده:
                      طبقة الجسم بمفردها هي الشبكة الأساسية بلا ملابس، وخط
                      الإنتاج ملتزم بألا يعرضها أبدًا (PRODUCT_BLUEPRINT §9).
                    */}
                    <img className="tile__thumb tile__thumb--bust" src={assetUrl(layer.back)} alt=""
                         style={{ zIndex: 0 }} />
                    {bodySrc && (
                      <img className="tile__thumb tile__thumb--bust" src={assetUrl(bodySrc)} alt=""
                           style={{ zIndex: 1 }} />
                    )}
                    {wornSrcs.map((src, i) => (
                      <img key={src} className="tile__thumb tile__thumb--bust" src={assetUrl(src)}
                           alt="" style={{ zIndex: 2 + i }} />
                    ))}
                    <img className="tile__thumb tile__thumb--bust" src={assetUrl(layer.front)} alt=""
                         style={{ zIndex: 9 }} />
                    {on && <span className="tile__check"><IconCheck size={13} /></span>}
                  </motion.button>
                )
              })}
              <div className="style__swatches">
                {Object.entries(manifest.hairColors).map(([color, meta]) => {
                  const on = avatar.hairColor === color
                  return (
                    <motion.button
                      key={color}
                      className={`swatch${on ? ' swatch--on' : ''}`}
                      whileTap={{ scale: 0.9 }}
                      style={{ background: HAIR_SWATCH[color] ?? '#3A2419' }}
                      onClick={() => { setAvatarPart('hairColor', color); haptic('select') }}
                      aria-label={tx(meta.name)}
                    />
                  )
                })}
              </div>
            </>
          )}

          {tab !== 'skin' && tab !== 'hair' && v &&
            garmentsByCategory(v, tab).map((g) => {
              const have = owned.includes(g.id)
              const on = avatar.worn[g.category as 'top'] === g.id
              const locked = !have && !!g.level && level < g.level
              return (
                <motion.button
                  key={g.id}
                  className={`tile${on ? ' tile--on' : ''}${locked ? ' tile--locked' : ''}`}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleGarment(g)}
                  aria-label={tx(g.name)}
                >
                  <img className={`tile__thumb tile__thumb--${g.category}`} src={assetUrl(g.src)} alt="" />
                  {g.rarity !== 'common' && (
                    <span className="tile__rarity"><RarityBadge rarity={g.rarity} /></span>
                  )}
                  {on && <span className="tile__check"><IconCheck size={13} /></span>}
                  {!have && !locked && g.price && (
                    <span className="tile__price u-num">
                      {g.price.currency === 'gems' ? '◆' : '●'} {n(g.price.amount)}
                    </span>
                  )}
                  {locked && (
                    <span className="tile__lock"><IconLock size={14} /> {g.level}</span>
                  )}
                </motion.button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export function StyleScreenFallback() {
  const { t } = useI18n()
  return (
    <div className="screen">
      <div className="empty body-sm">{t('common.loading')}</div>
    </div>
  )
}

