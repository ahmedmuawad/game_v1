import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { useToast } from '@/app/toast'
import { haptic } from '@/app/haptics'
import { RoomScene } from '@/components/room/RoomScene'
import { AvatarView } from '@/components/avatar/AvatarView'
import type { AvatarManifest } from '@/content/manifest'
import { FURNITURE } from '@/components/room/furniture'
import {
  FLOORS, WALLS, itemsForSlot, populatedSlots,
  type RoomItem, type RoomSurface,
} from '@/content/room'
import { Button, CurrencyPill, RarityBadge, Tabs } from '@/components/ui'
import { IconCheck, IconLock } from '@/app/icons'
import type { RoomMood, RoomSlot } from '@/state/types'
import './room-screen.css'

type EditTab = 'wall' | 'floor' | RoomSlot

const SLOT_KEY: Record<string, string> = {
  wall: 'room.cat.wall', floor: 'room.cat.floor',
  bed: 'room.cat.bed', desk: 'room.cat.desk', rug: 'room.cat.rug',
  poster: 'room.cat.poster', plant: 'room.cat.plant',
  shelf: 'room.cat.shelf', lamp: 'room.cat.lamp', pet: 'room.cat.pet',
}

const MOODS: RoomMood[] = ['day', 'sunset', 'night']
const MOOD_KEY: Record<RoomMood, string> = {
  day: 'room.mood.day', sunset: 'room.mood.sunset', night: 'room.mood.night',
}

/** مصغّرة للقطعة — نفس شكل SVG بس في إطاره الخاص. */
function ItemThumb({ item }: { item: RoomItem }) {
  const shape = FURNITURE[item.shape]
  if (!shape) return null
  /*
    كل شكل مرسوم في مساحته المحلية بمقاسات مختلفة (السرير 160×96،
    الملصق 44×56). `viewBox` واسع مع `preserveAspectRatio` بيخلّي
    الأشكال كلها تتقيّس لنفس المربع بلا جدول مقاسات لكل قطعة.
  */
  return (
    <svg viewBox="-8 -8 256 128" className="ritem__svg" aria-hidden="true">
      {shape({ colors: item.colors })}
    </svg>
  )
}

export function RoomScreen({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, tx, n } = useI18n()
  const { show: toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<EditTab>('wall')

  const room = useGame((s) => s.room)
  const avatar = useGame((s) => s.avatar)
  const owned = useGame((s) => s.owned)
  const coins = useGame((s) => s.coins)
  const gems = useGame((s) => s.gems)
  const level = useGame((s) => s.level)
  const spend = useGame((s) => s.spend)
  const grant = useGame((s) => s.grant)
  const setRoomSurface = useGame((s) => s.setRoomSurface)
  const setRoomSlot = useGame((s) => s.setRoomSlot)
  const setRoomMood = useGame((s) => s.setRoomMood)

  const tabs = useMemo(() => {
    const slots = populatedSlots()
    return [
      { id: 'wall' as EditTab, label: t('room.cat.wall') },
      { id: 'floor' as EditTab, label: t('room.cat.floor') },
      ...slots.map((s) => ({ id: s as EditTab, label: t(SLOT_KEY[s] as 'room.cat.bed') })),
    ]
  }, [t])

  /**
   * الشرا والوضع في خطوة واحدة.
   *
   * فصلهم لخطوتين («اشتري» بعدين «ضعي») بيضيف احتكاكًا بلا فايدة:
   * اللاعبة بتشتري القطعة عشان تشوفها في غرفتها، فالوضع الفوري هو
   * النية الواضحة. لو مش عايزاها تقدر ترجّع القديمة بلمسة.
   */
  function acquire(id: string, price: RoomItem['price'], lvl: number | null, place: () => void) {
    if (owned.includes(id)) { place(); haptic('select'); return }
    if (lvl !== null && level < lvl) {
      toast(t('shop.needLevel', { n: lvl }), 'warn'); haptic('warning'); return
    }
    if (!price) { place(); return }
    if (!spend(price.currency, price.amount, `room:${id}`)) {
      toast(t('econ.notEnough'), 'bad'); haptic('error'); return
    }
    grant({ items: [id] }, `room_purchase:${id}`)
    place()
    toast(t('econ.purchased'), 'good')
    haptic('success')
  }

  const surfaces: RoomSurface[] = tab === 'wall' ? WALLS : tab === 'floor' ? FLOORS : []
  const items: RoomItem[] = tab === 'wall' || tab === 'floor' ? [] : itemsForSlot(tab)

  return (
    <div className="screen">
      <div className="topbar">
        <CurrencyPill kind="coins" value={n(coins)} />
        <CurrencyPill kind="gems" value={n(gems)} />
        <span className="topbar__spacer" />
        <h1 className="h3">{t('room.title')}</h1>
      </div>

      <div className="screen__scroll">
        {/*
          الأفاتار جوّه الغرفة لا جنبها. غرفة بلا صاحبتها بتتقري كديكور،
          واللحظة اللي بتخلّي المساحة «بتاعتها» هي إنها تشوف نفسها
          واقفة فيها. الأصول موجودة أصلًا فالتكلفة صفر.
        */}
        <div className="rm__stage">
          <div className="rm__scene">
            <RoomScene room={room} highlight={editing && tab !== 'wall' && tab !== 'floor' ? tab : null} />
            <div className="rm__avatar">
              <AvatarView config={avatar} manifest={manifest} height={150} crop="full" still />
            </div>
          </div>
        </div>

        {/*
          الإضاءة برّه وضع التعديل عن قصد: هي أكتر حاجة بتغيّر إحساس
          الغرفة وأرخص حاجة تتجرّب، فخبّيها ورا زرار «عدّلي» كان
          هيدفن أقوى تفاعل في الشاشة.
        */}
        <div className="rm__moods">
          <span className="caption rm__moodsLabel">{t('room.mood')}</span>
          <div className="rm__moodRow">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`rm__mood${room.mood === m ? ' rm__mood--on' : ''}`}
                aria-pressed={room.mood === m}
                onClick={() => { setRoomMood(m); haptic('select') }}
              >
                {t(MOOD_KEY[m] as 'room.mood.day')}
              </button>
            ))}
          </div>
        </div>

        {!editing ? (
          <div className="rm__cta">
            <Button variant="secondary" size="lg" full
                    onClick={() => { setEditing(true); haptic('select') }}>
              {t('room.edit')}
            </Button>
          </div>
        ) : (
          <div className="rm__editor">
            <div className="rm__editorHead">
              <Button variant="ghost" size="sm"
                      onClick={() => { setEditing(false); haptic('select') }}>
                {t('common.done')}
              </Button>
            </div>

            <Tabs items={tabs} value={tab} onChange={setTab} />

            <div className="rm__grid">
              {surfaces.map((s) => {
                const have = owned.includes(s.id)
                const on = (tab === 'wall' ? room.wall : room.floor) === s.id
                return (
                  <motion.button
                    key={s.id}
                    className={`ritem${on ? ' ritem--on' : ''}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => acquire(s.id, s.price, null,
                      () => setRoomSurface(tab === 'wall' ? 'wall' : 'floor', s.id))}
                    aria-label={tx(s.name)}
                  >
                    <span className="ritem__paint" style={{ background: s.paint }} />
                    {on && <span className="tile__check"><IconCheck size={13} /></span>}
                    {!have && s.price && (
                      <span className="tile__price u-num">
                        {s.price.currency === 'gems' ? '◆' : '●'} {n(s.price.amount)}
                      </span>
                    )}
                  </motion.button>
                )
              })}

              {items.map((it) => {
                const have = owned.includes(it.id)
                const on = room.slots[it.slot] === it.id
                const locked = !have && it.level !== null && level < it.level
                return (
                  <motion.button
                    key={it.id}
                    className={`ritem${on ? ' ritem--on' : ''}${locked ? ' ritem--locked' : ''}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => acquire(it.id, it.price, it.level,
                      () => setRoomSlot(it.slot, on ? undefined : it.id))}
                    aria-label={tx(it.name)}
                  >
                    <ItemThumb item={it} />
                    {it.rarity !== 'common' && (
                      <span className="tile__rarity"><RarityBadge rarity={it.rarity} /></span>
                    )}
                    {on && <span className="tile__check"><IconCheck size={13} /></span>}
                    {locked && <span className="tile__lock"><IconLock size={14} /> {it.level}</span>}
                    {!have && !locked && it.price && (
                      <span className="tile__price u-num">
                        {it.price.currency === 'gems' ? '◆' : '●'} {n(it.price.amount)}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
