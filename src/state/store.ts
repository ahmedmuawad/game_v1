import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AvatarConfig, Currency, DailyMission, FlagValue, PlayerState,
  RoomMood, RoomSlot, TraitId, WearCategory,
} from './types'
import { SCHEMA_VERSION, createInitialState, todayKey } from './defaults'
import { getManifest, viewOf } from '@/content/manifest'
import { energyMaxForLevel, getConfig } from '@/systems/config'
import { regenEnergy } from '@/systems/energy'
import { advanceMissions, dailyGiftAmount, rollDay } from '@/systems/daily'
import { applyXp } from '@/systems/progression'
import { track } from '@/systems/analytics'

export interface RewardBundle {
  coins?: number
  gems?: number
  xp?: number
  energy?: number
  items?: string[]
}

/** نتيجة منح مكافأة — تستخدمها الواجهة لعرض الاحتفال. */
export interface GrantResult {
  coins: number
  gems: number
  xp: number
  items: string[]
  levelsGained: number
}

interface Actions {
  // ---- دورة الحياة ----
  boot: () => void
  completeOnboarding: (name: string, vibe: string, avatar: AvatarConfig) => void
  resetAll: () => void

  // ---- الاقتصاد ----
  grant: (reward: RewardBundle, source: string) => GrantResult
  spend: (currency: Currency, amount: number, reason: string) => boolean
  buyItem: (itemId: string) => boolean
  consumeEnergy: (amount?: number) => boolean
  addEnergy: (amount: number) => void

  // ---- التخصيص ----
  wear: (category: WearCategory, itemId: string | undefined) => void
  setAvatarPart: (part: keyof Omit<AvatarConfig, 'worn'>, value: string) => void
  setRoomSurface: (kind: 'wall' | 'floor', itemId: string) => void
  setRoomSlot: (slot: RoomSlot, itemId: string | undefined) => void
  setRoomMood: (mood: RoomMood) => void

  // ---- القصة ----
  setStoryNode: (nodeId: string | null) => void
  completeChapter: (chapterId: string, nextChapterId: string | null) => void
  adjustTrait: (trait: TraitId, delta: number) => void
  adjustRelationship: (characterId: string, delta: number) => void
  setFlag: (key: string, value: FlagValue) => void

  // ---- الحلقة اليومية ----
  claimDailyGift: () => number
  progressMission: (kind: DailyMission['kind'], amount?: number) => void
  claimMission: (missionId: string) => GrantResult | null
  markMomentSeen: (id: string) => void
  recordAdWatched: () => void

  // ---- الألعاب المصغّرة ----
  recordMinigame: (gameId: string, score: number) => boolean

  // ---- الإعدادات ----
  updateSettings: (patch: Partial<PlayerState['settings']>) => void
}

export type GameStore = PlayerState & Actions

const clampTrait = (v: number) => Math.max(0, Math.min(100, v))

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // ==================== دورة الحياة ====================

      boot: () => {
        const s = get()
        const now = Date.now()
        const regen = regenEnergy({ energy: s.energy, energyAt: s.energyAt }, s.level, now)
        const daily = rollDay(s.daily)
        const missions = daily.missions.length > 0 ? daily.missions : rollDay({ ...daily, day: '' }).missions

        set({
          energy: regen.energy,
          energyAt: regen.energyAt,
          daily: { ...daily, missions },
          stats: { ...s.stats, sessions: s.stats.sessions + 1 },
        })
        track('session_start', { sessions: s.stats.sessions + 1, streak: daily.streak })
      },

      completeOnboarding: (name, vibe, avatar) => {
        set({ onboarded: true, name, vibe, avatar })
        track('onboarding_complete', { vibe })
      },

      resetAll: () => {
        set({ ...createInitialState() })
        track('progress_reset', {})
      },

      // ==================== الاقتصاد ====================

      grant: (reward, source) => {
        const s = get()
        const coins = reward.coins ?? 0
        const gems = reward.gems ?? 0
        const xp = reward.xp ?? 0
        const newItems = (reward.items ?? []).filter((id) => !s.owned.includes(id))

        const lvl = applyXp(s.level, s.xp, xp)
        const maxEnergy = energyMaxForLevel(lvl.level)

        set({
          coins: s.coins + coins,
          gems: s.gems + gems + lvl.gemsAwarded,
          xp: lvl.xp,
          level: lvl.level,
          energy: Math.min(maxEnergy, s.energy + (reward.energy ?? 0)),
          owned: newItems.length ? [...s.owned, ...newItems] : s.owned,
          stats: {
            ...s.stats,
            coinsEarnedTotal: s.stats.coinsEarnedTotal + coins,
            itemsOwned: s.stats.itemsOwned + newItems.length,
          },
        })

        if (coins > 0) get().progressMission('earn_coins', coins)
        track('reward_granted', { source, coins, gems, xp, items: newItems.length })
        if (lvl.levelsGained > 0) track('level_up', { level: lvl.level })

        return { coins, gems: gems + lvl.gemsAwarded, xp, items: newItems, levelsGained: lvl.levelsGained }
      },

      spend: (currency, amount, reason) => {
        const s = get()
        if (amount <= 0) return true
        if (s[currency] < amount) {
          track('spend_failed', { currency, amount, reason })
          return false
        }
        set({ [currency]: s[currency] - amount } as Partial<PlayerState>)
        track('spend', { currency, amount, reason })
        return true
      },

      buyItem: (itemId) => {
        const s = get()
        const m = getManifest()
        const v = m ? viewOf(m) : null
        const item = v?.garments[itemId]
        if (!item || !item.price || s.owned.includes(itemId)) return false
        if (item.level && s.level < item.level) return false
        if (!get().spend(item.price.currency, item.price.amount, `buy:${itemId}`)) return false

        set({
          owned: [...get().owned, itemId],
          stats: { ...get().stats, itemsOwned: get().stats.itemsOwned + 1 },
        })
        track('item_purchased', {
          itemId, rarity: item.rarity, category: item.category,
          currency: item.price.currency, amount: item.price.amount,
        })
        return true
      },

      consumeEnergy: (amount = getConfig().energyPerChapter) => {
        const s = get()
        const regen = regenEnergy({ energy: s.energy, energyAt: s.energyAt }, s.level)
        if (regen.energy < amount) {
          set({ energy: regen.energy, energyAt: regen.energyAt })
          return false
        }
        // ابدأ عدّاد التجديد عند أول استهلاك من حالة ممتلئة
        const wasFull = regen.energy >= energyMaxForLevel(s.level)
        set({
          energy: regen.energy - amount,
          energyAt: wasFull ? Date.now() : regen.energyAt,
        })
        return true
      },

      addEnergy: (amount) => {
        const s = get()
        const max = energyMaxForLevel(s.level)
        set({ energy: Math.min(max, s.energy + amount) })
      },

      // ==================== التخصيص ====================

      wear: (category, itemId) => {
        const s = get()
        const worn = { ...s.avatar.worn }
        if (!itemId) {
          delete worn[category]
        } else {
          if (!s.owned.includes(itemId)) return
          worn[category] = itemId
          // الفستان يستبعد العلوي والسفلي، والعكس
          if (category === 'dress') { delete worn.top; delete worn.bottom }
          if (category === 'top' || category === 'bottom') delete worn.dress
        }
        set({
          avatar: { ...s.avatar, worn },
          stats: { ...s.stats, outfitChanges: s.stats.outfitChanges + 1 },
        })
        get().progressMission('change_outfit')
        track('outfit_changed', { category, itemId: itemId ?? null })
      },

      setAvatarPart: (part, value) => {
        const s = get()
        set({ avatar: { ...s.avatar, [part]: value } })
      },

      setRoomSurface: (kind, itemId) => {
        const s = get()
        if (!s.owned.includes(itemId)) return
        set({
          room: { ...s.room, [kind]: itemId },
          stats: { ...s.stats, roomEdits: s.stats.roomEdits + 1 },
        })
        get().progressMission('place_room_item')
        track('room_surface_changed', { kind, itemId })
      },

      setRoomSlot: (slot, itemId) => {
        const s = get()
        const slots = { ...s.room.slots }
        if (!itemId) {
          delete slots[slot]
        } else {
          if (!s.owned.includes(itemId)) return
          slots[slot] = itemId
        }
        set({
          room: { ...s.room, slots },
          stats: { ...s.stats, roomEdits: s.stats.roomEdits + 1 },
        })
        get().progressMission('place_room_item')
        track('room_slot_changed', { slot, itemId: itemId ?? null })
      },

      setRoomMood: (mood) => {
        set({ room: { ...get().room, mood } })
        track('room_mood_changed', { mood })
      },

      // ==================== القصة ====================

      setStoryNode: (nodeId) => {
        set({ story: { ...get().story, nodeId } })
      },

      completeChapter: (chapterId, nextChapterId) => {
        const s = get()
        if (s.story.completed.includes(chapterId)) {
          set({ story: { ...s.story, nodeId: null } })
          return
        }
        const cfg = getConfig()
        set({
          story: {
            ...s.story,
            completed: [...s.story.completed, chapterId],
            chapterId: nextChapterId ?? s.story.chapterId,
            nodeId: null,
            nextUnlockAt: cfg.chapterCooldownHours > 0
              ? Date.now() + cfg.chapterCooldownHours * 3_600_000
              : null,
          },
          stats: { ...s.stats, chaptersCompleted: s.stats.chaptersCompleted + 1 },
        })
        get().progressMission('read_chapter')
        track('chapter_complete', { chapterId, total: s.stats.chaptersCompleted + 1 })
      },

      adjustTrait: (trait, delta) => {
        const s = get()
        set({ traits: { ...s.traits, [trait]: clampTrait(s.traits[trait] + delta) } })
      },

      adjustRelationship: (characterId, delta) => {
        const s = get()
        const cur = s.relationships[characterId] ?? 50
        set({ relationships: { ...s.relationships, [characterId]: clampTrait(cur + delta) } })
      },

      setFlag: (key, value) => {
        set({ flags: { ...get().flags, [key]: value } })
      },

      // ==================== الحلقة اليومية ====================

      claimDailyGift: () => {
        const s = get()
        if (s.daily.giftClaimed) return 0
        const amount = dailyGiftAmount(Math.max(1, s.daily.streak))
        set({ daily: { ...s.daily, giftClaimed: true } })
        get().grant({ coins: amount, xp: 10 }, 'daily_gift')
        track('daily_gift_claimed', { streak: s.daily.streak, amount })
        return amount
      },

      progressMission: (kind, amount = 1) => {
        const s = get()
        const next = advanceMissions(s.daily.missions, kind, amount)
        if (next !== s.daily.missions) set({ daily: { ...s.daily, missions: next } })
      },

      claimMission: (missionId) => {
        const s = get()
        const m = s.daily.missions.find((x) => x.id === missionId)
        if (!m || m.claimed || m.progress < m.target) return null
        set({
          daily: {
            ...s.daily,
            missions: s.daily.missions.map((x) => (x.id === missionId ? { ...x, claimed: true } : x)),
          },
        })
        track('mission_claimed', { missionId, kind: m.kind })
        return get().grant(m.reward, `mission:${missionId}`)
      },

      markMomentSeen: (id) => {
        set({ daily: { ...get().daily, momentSeen: id } })
      },

      recordAdWatched: () => {
        const s = get()
        set({
          daily: { ...s.daily, adsWatched: s.daily.adsWatched + 1 },
          stats: { ...s.stats, adsWatchedTotal: s.stats.adsWatchedTotal + 1 },
        })
      },

      // ==================== الألعاب المصغّرة ====================

      recordMinigame: (gameId, score) => {
        const s = get()
        const prev = s.bestScores[gameId] ?? 0
        const isBest = score > prev
        set({
          bestScores: isBest ? { ...s.bestScores, [gameId]: score } : s.bestScores,
          stats: { ...s.stats, minigamesPlayed: s.stats.minigamesPlayed + 1 },
        })
        get().progressMission('play_minigame')
        track('minigame_complete', { gameId, score, isBest })
        return isBest
      },

      // ==================== الإعدادات ====================

      updateSettings: (patch) => {
        set({ settings: { ...get().settings, ...patch } })
        track('settings_changed', patch as Record<string, unknown>)
      },
    }),
    {
      name: 'livi.player.v1',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      // لا نحفظ الدوال — zustand/persist يحفظ الحالة فقط بحكم الشكل أدناه
      partialize: (s) => {
        const { boot: _b, completeOnboarding: _c, resetAll: _r, grant: _g, spend: _s,
          buyItem: _bi, consumeEnergy: _ce, addEnergy: _ae, wear: _w, setAvatarPart: _sa,
          setRoomSurface: _srs, setRoomSlot: _srl, setRoomMood: _srm, setStoryNode: _ssn,
          completeChapter: _cc, adjustTrait: _at, adjustRelationship: _ar, setFlag: _sf,
          claimDailyGift: _cd, progressMission: _pm, claimMission: _cm, markMomentSeen: _mm,
          recordAdWatched: _ra, recordMinigame: _rm, updateSettings: _us, ...data } = s
        return data as PlayerState
      },
      migrate: (persisted, fromVersion) => {
        // ترحيل الإصدارات المستقبلية يُضاف هنا.
        if (fromVersion < SCHEMA_VERSION) {
          return { ...createInitialState(), ...(persisted as Partial<PlayerState>), version: SCHEMA_VERSION }
        }
        return persisted as PlayerState
      },
    },
  ),
)

// ---- محدّدات مشتقة ----

export const selectEnergyMax = (s: GameStore) => energyMaxForLevel(s.level)
export const selectOwnsItem = (id: string) => (s: GameStore) => s.owned.includes(id)
export const selectDailyDone = (s: GameStore) =>
  s.daily.giftClaimed && s.daily.missions.every((m) => m.claimed)
export const selectTodayKey = () => todayKey()
