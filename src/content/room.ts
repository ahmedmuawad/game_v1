import type { LocalizedText } from '@/i18n/types'
import type { Currency, Rarity, RoomSlot } from '@/state/types'

/**
 * كتالوج الغرفة.
 *
 * الأثاث هنا **إجرائي**: أشكال SVG في `components/room/furniture.tsx`
 * بتاخد ألوانها من الكتالوج ده. يعني قطعة جديدة = سطر بيانات + شكل،
 * بلا أي أصول مصدَّرة. ده مقصود — الغرفة فيها تنويعات لونية كتير،
 * وتصدير صورة لكل تنويعة كان هيضاعف حجم الحزمة بلا مقابل.
 *
 * الأزياء ليها مسار مختلف (manifest.json المولَّد من خط الإنتاج) لأنها
 * لازم تتركّب على شبكة ثلاثية الأبعاد — مينفعش تترسم كـSVG.
 */

export interface RoomSurface {
  id: string
  name: LocalizedText
  /** لون مسطّح أو تدرّج CSS. */
  paint: string
  price: { currency: Currency; amount: number } | null
}

export interface RoomItem {
  id: string
  slot: RoomSlot
  /** مفتاح الشكل في FURNITURE. */
  shape: string
  colors: string[]
  name: LocalizedText
  rarity: Rarity
  price: { currency: Currency; amount: number } | null
  level: number | null
}

// ============================================================
// الحوائط
// ============================================================

export const WALLS: RoomSurface[] = [
  { id: 'wall_blush', name: { ar: 'وردي هادي', en: 'Blush' },
    paint: 'linear-gradient(180deg,#3A2A33,#2A1E27)', price: null },
  { id: 'wall_cream', name: { ar: 'كريمي', en: 'Cream' },
    paint: 'linear-gradient(180deg,#3B342C,#2B251F)', price: null },
  { id: 'wall_lilac', name: { ar: 'بنفسجي فاتح', en: 'Lilac' },
    paint: 'linear-gradient(180deg,#332B45,#241E33)', price: { currency: 'coins', amount: 180 } },
  { id: 'wall_mint', name: { ar: 'نعناعي', en: 'Mint' },
    paint: 'linear-gradient(180deg,#263A36,#1B2A27)', price: { currency: 'coins', amount: 180 } },
  { id: 'wall_ink', name: { ar: 'كحلي غامق', en: 'Ink' },
    paint: 'linear-gradient(180deg,#232840,#171A2B)', price: { currency: 'coins', amount: 260 } },
  { id: 'wall_sunset', name: { ar: 'غروب', en: 'Sunset' },
    paint: 'linear-gradient(180deg,#4A2E33,#2E1D28)', price: { currency: 'coins', amount: 320 } },
]

// ============================================================
// الأرضيات
// ============================================================

export const FLOORS: RoomSurface[] = [
  { id: 'floor_oak', name: { ar: 'بلوط', en: 'Oak' }, paint: '#5A4433', price: null },
  { id: 'floor_ash', name: { ar: 'رمادي', en: 'Ash' }, paint: '#4A4750', price: null },
  { id: 'floor_walnut', name: { ar: 'جوز', en: 'Walnut' },
    paint: '#43301F', price: { currency: 'coins', amount: 200 } },
  { id: 'floor_cloud', name: { ar: 'سحابي', en: 'Cloud' },
    paint: '#6B6472', price: { currency: 'coins', amount: 240 } },
  { id: 'floor_rose', name: { ar: 'وردي', en: 'Rose' },
    paint: '#6A4450', price: { currency: 'coins', amount: 300 } },
]

// ============================================================
// الأثاث
// ============================================================

export const ROOM_ITEMS: RoomItem[] = [
  // ---- أسرّة ----
  { id: 'bed_cream', slot: 'bed', shape: 'bed_soft', colors: ['#C9A98E', '#8E7259', '#E9C4CE'],
    name: { ar: 'سرير كريمي', en: 'Cream Bed' }, rarity: 'common', price: null, level: null },
  { id: 'bed_rose', slot: 'bed', shape: 'bed_canopy', colors: ['#D9AFBB', '#8E6070', '#F0CBD6'],
    name: { ar: 'سرير بمظلة', en: 'Canopy Bed' }, rarity: 'rare',
    price: { currency: 'coins', amount: 620 }, level: 3 },
  { id: 'bed_loft', slot: 'bed', shape: 'bed_loft', colors: ['#8DA6B8', '#5B7183', '#EDE6DC'],
    name: { ar: 'سرير علوي', en: 'Loft Bed' }, rarity: 'epic',
    price: { currency: 'gems', amount: 22 }, level: 6 },

  // ---- مكاتب ----
  { id: 'desk_plain', slot: 'desk', shape: 'desk_plain', colors: ['#B99873', '#7C6249'],
    name: { ar: 'مكتب مذاكرة', en: 'Study Desk' }, rarity: 'common', price: null, level: null },
  { id: 'desk_vanity', slot: 'desk', shape: 'desk_vanity', colors: ['#D4B9A5', '#8A7160', '#E0C078'],
    name: { ar: 'تسريحة', en: 'Vanity' }, rarity: 'rare',
    price: { currency: 'coins', amount: 540 }, level: 2 },
  { id: 'desk_creator', slot: 'desk', shape: 'desk_creator', colors: ['#3E3550', '#A78BE8', '#E0C078'],
    name: { ar: 'ركن المحتوى', en: 'Creator Desk' }, rarity: 'epic',
    price: { currency: 'gems', amount: 18 }, level: 5 },

  // ---- سجاد ----
  /* السجادة مجانية: الغرفة الابتدائية بسرير ومكتب بس بتتقري كأوضة فاضية
     لا كمساحة شخصية، والسجادة أرخص حاجة بتملا الأرضية بصريًا. */
  { id: 'rug_round', slot: 'rug', shape: 'rug_round', colors: ['#C98BA0', '#E3B7C6'],
    name: { ar: 'سجادة دائرية', en: 'Round Rug' }, rarity: 'common',
    price: null, level: null },
  { id: 'rug_rect', slot: 'rug', shape: 'rug_rect', colors: ['#7E93B8', '#A9BBD6'],
    name: { ar: 'سجادة مستطيلة', en: 'Rect Rug' }, rarity: 'common',
    price: { currency: 'coins', amount: 160 }, level: null },

  // ---- نباتات ----
  { id: 'plant_big', slot: 'plant', shape: 'plant_big', colors: ['#5E9B68', '#B98A6A'],
    name: { ar: 'نبتة كبيرة', en: 'Big Plant' }, rarity: 'common',
    price: { currency: 'coins', amount: 140 }, level: null },
  { id: 'plant_hang', slot: 'plant', shape: 'plant_hang', colors: ['#6FB58A', '#C9A98E'],
    name: { ar: 'نبتة معلّقة', en: 'Hanging Plant' }, rarity: 'rare',
    price: { currency: 'coins', amount: 280 }, level: 2 },

  // ---- ملصقات ----
  { id: 'poster_stars', slot: 'poster', shape: 'poster_a', colors: ['#332B45', '#E8C46A'],
    name: { ar: 'ملصق نجوم', en: 'Stars Poster' }, rarity: 'common',
    price: { currency: 'coins', amount: 120 }, level: null },
  { id: 'poster_wave', slot: 'poster', shape: 'poster_b', colors: ['#2A3A45', '#7FD3E0'],
    name: { ar: 'ملصق موجة', en: 'Wave Poster' }, rarity: 'common',
    price: { currency: 'coins', amount: 120 }, level: null },

  // ---- أرفف ----
  { id: 'shelf_books', slot: 'shelf', shape: 'shelf_a', colors: ['#B99873', '#D98BA0', '#7FB0D3'],
    name: { ar: 'رف كتب', en: 'Book Shelf' }, rarity: 'common',
    price: { currency: 'coins', amount: 200 }, level: null },
  { id: 'shelf_gold', slot: 'shelf', shape: 'shelf_b', colors: ['#8A7160', '#E0C078'],
    name: { ar: 'رف ذهبي', en: 'Gold Shelf' }, rarity: 'rare',
    price: { currency: 'coins', amount: 420 }, level: 4 },

  // ---- إضاءة ----
  { id: 'lamp_arc', slot: 'lamp', shape: 'lamp_arc', colors: ['#F0D9A8', '#8A7160'],
    name: { ar: 'أباجورة قوس', en: 'Arc Lamp' }, rarity: 'common',
    price: { currency: 'coins', amount: 180 }, level: null },
  { id: 'lamp_neon', slot: 'lamp', shape: 'lamp_neon', colors: ['#FF6EA8', '#A78BE8'],
    name: { ar: 'نيون', en: 'Neon Sign' }, rarity: 'rare',
    price: { currency: 'coins', amount: 460 }, level: 3 },
  { id: 'lamp_string', slot: 'lamp', shape: 'lamp_string', colors: ['#FFE3A8'],
    name: { ar: 'لمبات معلّقة', en: 'String Lights' }, rarity: 'rare',
    price: { currency: 'coins', amount: 380 }, level: 2 },
]

// ---- استعلامات ----

export const ROOM_ITEMS_BY_ID: Record<string, RoomItem> =
  Object.fromEntries(ROOM_ITEMS.map((i) => [i.id, i]))

export const SURFACES_BY_ID: Record<string, RoomSurface> =
  Object.fromEntries([...WALLS, ...FLOORS].map((s) => [s.id, s]))

export function itemsForSlot(slot: RoomSlot): RoomItem[] {
  return ROOM_ITEMS.filter((i) => i.slot === slot)
}

/** الفتحات اللي فيها قطع فعلًا — الفتحة الفاضية تبان كعطل لا كفئة قادمة. */
export function populatedSlots(): RoomSlot[] {
  const seen = new Set<RoomSlot>()
  for (const i of ROOM_ITEMS) seen.add(i.slot)
  return [...seen]
}

/** كل ما يُمنح مجانًا عند بدء اللعب. */
export const STARTER_ROOM_IDS = [
  ...WALLS.filter((w) => w.price === null).map((w) => w.id),
  ...FLOORS.filter((f) => f.price === null).map((f) => f.id),
  ...ROOM_ITEMS.filter((i) => i.price === null).map((i) => i.id),
]
