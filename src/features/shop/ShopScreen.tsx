import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { useToast } from '@/app/toast'
import { haptic } from '@/app/haptics'
import { AvatarView } from '@/components/avatar/AvatarView'
import {
  assetUrl, garmentsByCategory, viewOf,
  type AvatarManifest, type GarmentLayer,
} from '@/content/manifest'
import { Button, CurrencyPill, RarityBadge, Sheet, Tabs, EmptyState } from '@/components/ui'
import { IconCheck, IconLock, IconSpark } from '@/app/icons'
import { affordability, pickDailyShop, type ShopEntry } from '@/systems/shop'
import { todayKey } from '@/state/defaults'
import type { WearCategory } from '@/state/types'
import './shop.css'

type Cat = 'all' | WearCategory

const CAT_KEYS: { id: Cat; key: string }[] = [
  { id: 'all',       key: 'shop.all' },
  { id: 'top',       key: 'style.cat.top' },
  { id: 'bottom',    key: 'style.cat.bottom' },
  { id: 'dress',     key: 'style.cat.dress' },
  { id: 'shoes',     key: 'style.cat.shoes' },
  { id: 'accessory', key: 'style.cat.acc' },
]

const CATS: WearCategory[] = ['top', 'bottom', 'dress', 'shoes', 'accessory']

type Garment = GarmentLayer & { id: string }

const entryOf = (g: Garment): ShopEntry => ({
  id: g.id,
  category: g.category,
  rarity: g.rarity,
  price: g.price as NonNullable<GarmentLayer['price']>,
  level: g.level,
})

export function ShopScreen({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, tx, n } = useI18n()
  const { show: toast } = useToast()
  const [cat, setCat] = useState<Cat>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const avatar = useGame((s) => s.avatar)
  const owned = useGame((s) => s.owned)
  const coins = useGame((s) => s.coins)
  const gems = useGame((s) => s.gems)
  const level = useGame((s) => s.level)
  const buyItem = useGame((s) => s.buyItem)
  const wear = useGame((s) => s.wear)

  const v = manifest ? viewOf(manifest) : null

  /** كل القطع اللي ليها سعر — دي بضاعة المتجر. */
  const all = useMemo<Garment[]>(() => {
    if (!v) return []
    return CATS.flatMap((c) => garmentsByCategory(v, c)).filter((g) => g.price !== null)
  }, [v])

  const entries = useMemo(() => all.map(entryOf), [all])

  const daily = useMemo(
    () => pickDailyShop(entries, owned, level, todayKey(), 3),
    [entries, owned, level],
  )

  const shown = useMemo(
    () => (cat === 'all' ? all : all.filter((g) => g.category === cat)),
    [all, cat],
  )

  const open = openId ? all.find((g) => g.id === openId) ?? null : null

  /** الإطلالة مع القطعة المعروضة — معاينة قبل الشرا. */
  const previewConfig = useMemo(() => {
    if (!open) return avatar
    const worn = { ...avatar.worn, [open.category]: open.id }
    if (open.category === 'dress') { delete worn.top; delete worn.bottom }
    if (open.category === 'top' || open.category === 'bottom') delete worn.dress
    return { ...avatar, worn }
  }, [avatar, open])

  function handleBuy(g: Garment) {
    const state = affordability(entryOf(g), owned, level, coins, gems)
    if (state === 'locked') {
      toast(t('shop.needLevel', { n: g.level ?? 0 }), 'warn')
      haptic('warning')
      return
    }
    if (state === 'poor') {
      toast(t('econ.notEnough'), 'bad')
      haptic('error')
      return
    }
    if (buyItem(g.id)) {
      wear(g.category as WearCategory, g.id)
      toast(t('econ.purchased'), 'good')
      haptic('success')
      setOpenId(null)
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <CurrencyPill kind="coins" value={n(coins)} />
        <CurrencyPill kind="gems" value={n(gems)} />
        <span className="topbar__spacer" />
        <h1 className="h3">{t('shop.title')}</h1>
      </div>

      <div className="screen__scroll">
        {daily.length > 0 && (
          <section className="shop__daily">
            <div className="shop__dailyHead">
              <IconSpark size={15} />
              <h2 className="h4">{t('shop.dailyPick')}</h2>
            </div>
            <div className="shop__dailyRow">
              {daily.map((d) => {
                const g = all.find((x) => x.id === d.id)
                if (!g) return null
                return (
                  <motion.button
                    key={g.id}
                    className="shop__feat"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setOpenId(g.id); haptic('select') }}
                  >
                    <img
                      className={`shop__featImg shop__featImg--${g.category}`}
                      src={assetUrl(g.src)}
                      alt=""
                    />
                    <span className="shop__featName body-sm">{tx(g.name)}</span>
                    <span className="shop__featPrice u-num">
                      {d.price.currency === 'gems' ? '◆' : '●'} {n(d.price.amount)}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </section>
        )}

        <Tabs
          items={CAT_KEYS
            .filter((c) => c.id === 'all' || all.some((g) => g.category === c.id))
            .map((c) => ({ id: c.id, label: t(c.key as 'shop.all') }))}
          value={cat}
          onChange={setCat}
        />

        <div className="shop__grid">
          {shown.map((g) => {
            const state = affordability(entryOf(g), owned, level, coins, gems)
            const price = g.price as NonNullable<GarmentLayer['price']>
            return (
              <motion.button
                key={g.id}
                className={`tile${state === 'locked' ? ' tile--locked' : ''}`}
                whileTap={{ scale: 0.94 }}
                onClick={() => { setOpenId(g.id); haptic('select') }}
                aria-label={tx(g.name)}
              >
                <img className={`tile__thumb tile__thumb--${g.category}`} src={assetUrl(g.src)} alt="" />
                {g.rarity !== 'common' && (
                  <span className="tile__rarity"><RarityBadge rarity={g.rarity} /></span>
                )}
                {state === 'owned' && <span className="tile__check"><IconCheck size={13} /></span>}
                {state === 'locked' && <span className="tile__lock"><IconLock size={14} /> {g.level}</span>}
                {(state === 'ok' || state === 'poor') && (
                  <span className={`tile__price u-num${state === 'poor' ? ' tile__price--poor' : ''}`}>
                    {price.currency === 'gems' ? '◆' : '●'} {n(price.amount)}
                  </span>
                )}
              </motion.button>
            )
          })}
          {shown.length === 0 && <EmptyState>{t('shop.ownedAll')}</EmptyState>}
        </div>
      </div>

      {/*
        المعاينة بتتركّب على الأفاتار نفسه لا على صورة القطعة لوحدها:
        القطعة معلّقة في الفراغ مش بتقول للاعبة هتبان عاملة إزاي عليها،
        والقرار المفروض يتاخد بالشكل النهائي لا بصورة مسطّحة.
      */}
      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? tx(open.name) : ''}>
        {open && (
          <div className="shop__detail">
            <div className="shop__preview">
              <AvatarView config={previewConfig} manifest={manifest} height={220} crop="full" still />
              <span className="shop__previewTag body-xs">{t('shop.tryingOn')}</span>
            </div>

            <div className="shop__meta">
              <RarityBadge rarity={open.rarity} />
              {open.level !== null && (
                <span className="shop__lvl body-xs">{t('common.level')} {open.level}</span>
              )}
            </div>

            {owned.includes(open.id) ? (
              <Button
                variant="secondary" size="lg" full
                onClick={() => {
                  wear(open.category as WearCategory, open.id)
                  toast(t('common.equipped'), 'good')
                  haptic('success')
                  setOpenId(null)
                }}
              >
                {t('shop.wearNow')}
              </Button>
            ) : (
              <Button
                variant={(open.price as NonNullable<GarmentLayer['price']>).currency === 'gems' ? 'gold' : 'primary'}
                size="lg"
                full
                onClick={() => handleBuy(open)}
              >
                {t('shop.buy')} ·{' '}
                {(open.price as NonNullable<GarmentLayer['price']>).currency === 'gems' ? '◆' : '●'}{' '}
                {n((open.price as NonNullable<GarmentLayer['price']>).amount)}
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
