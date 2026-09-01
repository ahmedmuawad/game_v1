import type { LocalizedText } from '@/i18n/types'

// ============================================================
// الاقتصاد
// ============================================================

export type Currency = 'coins' | 'gems'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Price {
  currency: Currency
  amount: number
}

// ============================================================
// السمات والعلاقات
// ============================================================

export type TraitId = 'confidence' | 'creativity' | 'empathy' | 'wits'

export const TRAIT_IDS: TraitId[] = ['confidence', 'creativity', 'empathy', 'wits']

export type Traits = Record<TraitId, number>

/** قيمة علم القصة — تسمح بحالة سردية غنية دون تعقيد. */
export type FlagValue = boolean | number | string

// ============================================================
// الأفاتار
// ============================================================

export type WearCategory = 'hair' | 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'

export interface AvatarConfig {
  skinTone: string
  hairStyle: string
  hairColor: string
  eyeShape: string
  eyeColor: string
  lipColor: string
  /** العناصر المرتداة حاليًا، حسب الفئة. */
  worn: Partial<Record<WearCategory, string>>
}

// ============================================================
// الغرفة
// ============================================================

export type RoomMood = 'day' | 'sunset' | 'night'

export type RoomSlot =
  | 'bed' | 'desk' | 'rug' | 'poster' | 'plant' | 'shelf' | 'lamp' | 'pet'

export const ROOM_SLOTS: RoomSlot[] = ['bed', 'desk', 'rug', 'poster', 'plant', 'shelf', 'lamp', 'pet']

export interface RoomConfig {
  wall: string
  floor: string
  mood: RoomMood
  slots: Partial<Record<RoomSlot, string>>
}

// ============================================================
// العناصر (محتوى)
// ============================================================

export type ItemKind = 'wear' | 'room' | 'surface'

/**
 * وسم الأسلوب — الجسر بين التخصيص والقصة (انظر DECISIONS.md#D-003).
 * عقد القصة تستطيع الاستعلام عن هذه الأوسمة لتعليق الشخصيات على إطلالتك.
 */
export type StyleTag = 'casual' | 'formal' | 'sporty' | 'cozy' | 'bold' | 'soft' | 'dreamy' | 'seasonal'

export interface GameItem {
  id: string
  kind: ItemKind
  /** WearCategory للملابس، RoomSlot للأثاث، 'wall'|'floor' للأسطح. */
  category: string
  name: LocalizedText
  rarity: Rarity
  tags: StyleTag[]
  price?: Price
  /** المستوى المطلوب لظهوره في المتجر. */
  unlockLevel?: number
  /** يمنح مجانًا عند بداية اللعب. */
  starter?: boolean
  /** معرّف الموسم لو كان عنصرًا موسميًا. */
  season?: string
  /** بيانات الرسم — تُفسَّر بواسطة طبقة العرض. */
  render: ItemRender
}

export interface ItemRender {
  /** معرّف الشكل في مكتبة الأشكال (SVG). */
  shape: string
  /** الألوان الأساسية للقطعة. */
  colors: string[]
}

// ============================================================
// تقدّم القصة
// ============================================================

export interface StoryProgress {
  /** الموسم الحالي. */
  seasonId: string
  /** الفصل المفتوح الحالي. */
  chapterId: string
  /** العقدة الحالية داخل الفصل، أو null لو الفصل لم يبدأ. */
  nodeId: string | null
  /** معرّفات الفصول المكتملة. */
  completed: string[]
  /** طابع زمني (ms) لفتح الفصل التالي. */
  nextUnlockAt: number | null
}

// ============================================================
// الحلقة اليومية
// ============================================================

export interface DailyMission {
  id: string
  /** معرّف نوع المهمة، يُطابَق مع أحداث اللعب. */
  kind: 'play_minigame' | 'read_chapter' | 'change_outfit' | 'place_room_item' | 'earn_coins'
  target: number
  progress: number
  reward: { coins?: number; gems?: number; xp?: number }
  claimed: boolean
}

export interface DailyState {
  /** تاريخ اليوم المحلي بصيغة YYYY-MM-DD. */
  day: string
  streak: number
  /** الأسبوع (ISO) الذي استُخدمت فيه التجميدة المجانية. */
  freezeUsedWeek: string | null
  /** هل استُلمت هدية اليوم؟ */
  giftClaimed: boolean
  missions: DailyMission[]
  /** معرّف «لحظة اليوم» التي عُرضت. */
  momentSeen: string | null
  /** عدد الإعلانات المكافِئة التي شوهدت اليوم. */
  adsWatched: number
}

// ============================================================
// الإعدادات
// ============================================================

export interface Settings {
  music: boolean
  sfx: boolean
  haptics: boolean
  reduceMotion: boolean
}

// ============================================================
// الإحصاءات (للتحليلات المحلية والمهام)
// ============================================================

export interface Stats {
  sessions: number
  chaptersCompleted: number
  minigamesPlayed: number
  itemsOwned: number
  outfitChanges: number
  roomEdits: number
  coinsEarnedTotal: number
  adsWatchedTotal: number
  firstLaunchAt: number
}

// ============================================================
// حالة اللاعب الكاملة
// ============================================================

export interface PlayerState {
  /** إصدار المخطط — لترحيل البيانات المحفوظة. */
  version: number
  onboarded: boolean
  name: string
  vibe: string

  level: number
  xp: number

  coins: number
  gems: number
  energy: number
  /** آخر لحظة حُسب فيها تجدد الطاقة (ms). */
  energyAt: number

  traits: Traits
  relationships: Record<string, number>
  flags: Record<string, FlagValue>

  owned: string[]
  avatar: AvatarConfig
  room: RoomConfig

  story: StoryProgress
  daily: DailyState
  settings: Settings
  stats: Stats

  /** أفضل نتيجة لكل لعبة مصغّرة. */
  bestScores: Record<string, number>
}
