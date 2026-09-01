import { useMemo, useState } from 'react'
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

type Tab = 'skin' | 'hair' | 'top' | 'bottom' | 'dress' | 'shoes'

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

  const tabs = useMemo(
    () => [
      { id: 'top' as Tab, label: t('style.cat.top') },
      { id: 'bottom' as Tab, label: t('style.cat.bottom') },
      { id: 'dress' as Tab, label: t('style.cat.dress') },
      { id: 'shoes' as Tab, label: t('style.cat.shoes') },
      { id: 'hair' as Tab, label: t('style.cat.hair') },
      { id: 'skin' as Tab, label: t('style.skin') },
    ],
    [t],
  )

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
              const src = v?.body[bodyKey(key, avatar.eyes)]?.src
              return (
                <motion.button
                  key={key}
                  className={`tile${on ? ' tile--on' : ''}`}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { setAvatarPart('skin', key); haptic('select') }}
                  aria-label={tx(meta.name)}
                >
                  {src && <img className="tile__thumb tile__thumb--head" src={assetUrl(src)} alt="" />}
                  {on && <span className="tile__check"><IconCheck size={13} /></span>}
                </motion.button>
              )
            })}

          {tab === 'hair' && manifest &&
            Object.keys(manifest.hairStyles).flatMap((style) =>
              Object.keys(manifest.hairColors).map((color) => {
                const key = hairKey(style, color)
                const layer = v?.hair[key]
                if (!layer) return null
                const on = avatar.hairStyle === style && avatar.hairColor === color
                return (
                  <motion.button
                    key={key}
                    className={`tile${on ? ' tile--on' : ''}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setAvatarPart('hairStyle', style)
                      setAvatarPart('hairColor', color)
                      haptic('select')
                    }}
                    aria-label={tx(layer.name)}
                  >
                    <img className="tile__thumb tile__thumb--head" src={assetUrl(layer.front)} alt="" />
                    {on && <span className="tile__check"><IconCheck size={13} /></span>}
                  </motion.button>
                )
              }),
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

