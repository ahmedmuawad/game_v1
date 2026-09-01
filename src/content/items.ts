import type { GameItem, ItemKind, Price, Rarity, StyleTag } from '@/state/types'
import type { LocalizedText } from '@/i18n/types'

/**
 * كتالوج العناصر.
 *
 * مبدأ أخلاقي (DECISIONS.md#D-011): **الهوية مجانية دائمًا.**
 * لون البشرة، شكل العين، تسريحة الشعر ولونه — كلها متاحة بلا مقابل منذ اللحظة الأولى.
 * الاقتصاد يبيع **التعبير** (أزياء، أثاث)، ولا يبيع أبدًا القدرة على أن تشبه نفسك.
 */

interface Def {
  id: string
  kind: ItemKind
  category: string
  ar: string
  en: string
  shape: string
  colors: string[]
  rarity?: Rarity
  tags?: StyleTag[]
  price?: Price
  level?: number
  starter?: boolean
  season?: string
}

const RARITY_PRICE: Record<Rarity, Price> = {
  common: { currency: 'coins', amount: 160 },
  rare: { currency: 'coins', amount: 480 },
  epic: { currency: 'gems', amount: 24 },
  legendary: { currency: 'gems', amount: 60 },
}

function build(defs: Def[]): GameItem[] {
  return defs.map((d) => {
    const rarity = d.rarity ?? 'common'
    const name: LocalizedText = { ar: d.ar, en: d.en }
    const item: GameItem = {
      id: d.id,
      kind: d.kind,
      category: d.category,
      name,
      rarity,
      tags: d.tags ?? ['casual'],
      render: { shape: d.shape, colors: d.colors },
    }
    if (!d.starter) item.price = d.price ?? RARITY_PRICE[rarity]
    if (d.starter) item.starter = true
    if (d.level) item.unlockLevel = d.level
    if (d.season) item.season = d.season
    return item
  })
}

// ============================================================
// الملابس — القطع العلوية
// ============================================================

const TOPS: Def[] = [
  { id: 'top_tee_cream',   kind: 'wear', category: 'top', ar: 'تيشيرت كريمي', en: 'Cream Tee',       shape: 'tee',        colors: ['#F0E6DA', '#E0D2C2'], starter: true, tags: ['casual', 'soft'] },
  { id: 'top_tee_rose',    kind: 'wear', category: 'top', ar: 'تيشيرت وردي', en: 'Rose Tee',          shape: 'tee',        colors: ['#F2A0B8', '#E086A2'], tags: ['casual', 'soft'] },
  { id: 'top_tee_ink',     kind: 'wear', category: 'top', ar: 'تيشيرت أسود', en: 'Ink Tee',           shape: 'tee',        colors: ['#2A2233', '#1C1724'], tags: ['casual', 'bold'] },
  { id: 'top_tank_sage',   kind: 'wear', category: 'top', ar: 'توب ساج', en: 'Sage Tank',             shape: 'tank',       colors: ['#A9C4A4', '#93AF8E'], tags: ['casual', 'sporty'] },
  { id: 'top_hoodie_lilac',kind: 'wear', category: 'top', ar: 'هودي ليلكي', en: 'Lilac Hoodie',       shape: 'crop_hoodie',colors: ['#B7A6E8', '#9C8AD0'], rarity: 'rare', tags: ['cozy', 'dreamy'] },
  { id: 'top_hoodie_sky',  kind: 'wear', category: 'top', ar: 'هودي سماوي', en: 'Sky Hoodie',         shape: 'crop_hoodie',colors: ['#9CC5EA', '#7FA9D2'], rarity: 'rare', tags: ['cozy', 'sporty'] },
  { id: 'top_blouse_pearl',kind: 'wear', category: 'top', ar: 'بلوزة لؤلؤية', en: 'Pearl Blouse',      shape: 'blouse',     colors: ['#F6F1E8', '#DCD3C4'], rarity: 'rare', tags: ['formal', 'soft'] },
  { id: 'top_blouse_wine', kind: 'wear', category: 'top', ar: 'بلوزة نبيتي', en: 'Wine Blouse',        shape: 'blouse',     colors: ['#8E3A52', '#71263C'], rarity: 'rare', tags: ['formal', 'bold'], level: 5 },
  { id: 'top_sweater_oat', kind: 'wear', category: 'top', ar: 'سويتر بيج', en: 'Oat Sweater',          shape: 'sweater',    colors: ['#DCC9AE', '#C4AF92'], tags: ['cozy', 'soft'] },
  { id: 'top_sweater_moss',kind: 'wear', category: 'top', ar: 'سويتر أخضر', en: 'Moss Sweater',        shape: 'sweater',    colors: ['#7A9068', '#647853'], rarity: 'rare', tags: ['cozy'] },
  { id: 'top_jacket_denim',kind: 'wear', category: 'top', ar: 'جاكيت جينز', en: 'Denim Jacket',        shape: 'jacket',     colors: ['#6E8CB0', '#57718F'], rarity: 'rare', tags: ['casual', 'bold'] },
  { id: 'top_jacket_varsity',kind:'wear',category: 'top', ar: 'جاكيت مدرسي', en: 'Varsity Jacket',     shape: 'jacket',     colors: ['#3B3350', '#E6D5B8'], rarity: 'epic', tags: ['sporty', 'bold'], level: 8 },
  { id: 'top_cardigan_blush',kind:'wear',category: 'top', ar: 'كارديجان وردي', en: 'Blush Cardigan',   shape: 'cardigan',   colors: ['#EFC3CE', '#D9A5B3'], rarity: 'rare', tags: ['cozy', 'soft'] },
  { id: 'top_cardigan_night',kind:'wear',category: 'top', ar: 'كارديجان ليلي', en: 'Midnight Cardigan',shape: 'cardigan',   colors: ['#3A3560', '#282348'], rarity: 'epic', tags: ['dreamy', 'formal'], level: 10 },
]

// ============================================================
// الملابس — القطع السفلية
// ============================================================

const BOTTOMS: Def[] = [
  { id: 'bot_jeans_classic', kind: 'wear', category: 'bottom', ar: 'جينز كلاسيك', en: 'Classic Jeans', shape: 'jeans',        colors: ['#6E86A8', '#5A7090'], starter: true, tags: ['casual'] },
  { id: 'bot_jeans_black',   kind: 'wear', category: 'bottom', ar: 'جينز أسود', en: 'Black Jeans',      shape: 'jeans',        colors: ['#2E2836', '#221D29'], tags: ['casual', 'bold'] },
  { id: 'bot_skirt_cream',   kind: 'wear', category: 'bottom', ar: 'جيبة كريمي', en: 'Cream Skirt',     shape: 'skirt_a',      colors: ['#EFE3D2', '#D9CBB6'], tags: ['soft', 'formal'] },
  { id: 'bot_skirt_plaid',   kind: 'wear', category: 'bottom', ar: 'جيبة كاروهات', en: 'Plaid Skirt',   shape: 'skirt_pleated',colors: ['#A85C6E', '#8A4356'], rarity: 'rare', tags: ['casual', 'bold'] },
  { id: 'bot_skirt_navy',    kind: 'wear', category: 'bottom', ar: 'جيبة كحلي', en: 'Navy Pleats',      shape: 'skirt_pleated',colors: ['#3E4A72', '#2E3859'], rarity: 'rare', tags: ['formal'] },
  { id: 'bot_shorts_denim',  kind: 'wear', category: 'bottom', ar: 'شورت جينز', en: 'Denim Shorts',     shape: 'shorts',       colors: ['#7E96B8', '#67809E'], tags: ['casual', 'sporty'] },
  { id: 'bot_joggers_grey',  kind: 'wear', category: 'bottom', ar: 'جوجر رمادي', en: 'Grey Joggers',    shape: 'joggers',      colors: ['#7B7686', '#65616F'], tags: ['cozy', 'sporty'] },
  { id: 'bot_joggers_rose',  kind: 'wear', category: 'bottom', ar: 'جوجر وردي', en: 'Rose Joggers',     shape: 'joggers',      colors: ['#DFA9B6', '#C68E9B'], rarity: 'rare', tags: ['cozy', 'soft'] },
  { id: 'bot_wide_ivory',    kind: 'wear', category: 'bottom', ar: 'بنطلون واسع', en: 'Ivory Wide-Leg', shape: 'wide_pants',   colors: ['#EDE4D6', '#D5CABA'], rarity: 'rare', tags: ['formal', 'soft'], level: 6 },
  { id: 'bot_wide_plum',     kind: 'wear', category: 'bottom', ar: 'بنطلون برقوقي', en: 'Plum Wide-Leg',shape: 'wide_pants',   colors: ['#5B3B62', '#452B4B'], rarity: 'epic', tags: ['bold', 'dreamy'], level: 12 },
]

// ============================================================
// الفساتين
// ============================================================

const DRESSES: Def[] = [
  { id: 'dr_sun_butter',  kind: 'wear', category: 'dress', ar: 'فستان صيفي', en: 'Butter Sundress',    shape: 'sundress',    colors: ['#F3DC9E', '#DFC482'], tags: ['soft', 'casual'] },
  { id: 'dr_sun_mint',    kind: 'wear', category: 'dress', ar: 'فستان نعناعي', en: 'Mint Sundress',     shape: 'sundress',    colors: ['#A8DCC8', '#8CC2AE'], rarity: 'rare', tags: ['soft'] },
  { id: 'dr_hoodie_grey', kind: 'wear', category: 'dress', ar: 'فستان هودي', en: 'Hoodie Dress',        shape: 'hoodie_dress',colors: ['#8A8496', '#736D7F'], rarity: 'rare', tags: ['cozy', 'casual'] },
  { id: 'dr_overalls_den',kind: 'wear', category: 'dress', ar: 'أفرول جينز', en: 'Denim Overalls',      shape: 'overalls',    colors: ['#6C88AC', '#F0E6DA'], rarity: 'rare', tags: ['casual'] },
  { id: 'dr_party_rose',  kind: 'wear', category: 'dress', ar: 'فستان سهرة وردي', en: 'Rose Party Dress',shape:'party_dress', colors: ['#E4788F', '#C85D74'], rarity: 'epic', tags: ['formal', 'bold'], level: 7 },
  { id: 'dr_party_night', kind: 'wear', category: 'dress', ar: 'فستان ليلي', en: 'Midnight Dress',      shape: 'party_dress', colors: ['#3D3468', '#2B2450'], rarity: 'epic', tags: ['formal', 'dreamy'], level: 9 },
  { id: 'dr_formal_gold', kind: 'wear', category: 'dress', ar: 'فستان ذهبي', en: 'Gilded Gown',         shape: 'formal',      colors: ['#D9B063', '#BE9448'], rarity: 'legendary', tags: ['formal', 'bold'], level: 15 },
  { id: 'dr_formal_ivory',kind: 'wear', category: 'dress', ar: 'فستان عاجي', en: 'Ivory Gown',          shape: 'formal',      colors: ['#F2ECE0', '#DAD2C2'], rarity: 'epic', tags: ['formal', 'soft'], level: 11 },
]

// ============================================================
// الأحذية
// ============================================================

const SHOES: Def[] = [
  { id: 'sh_sneak_white', kind: 'wear', category: 'shoes', ar: 'سنيكرز أبيض', en: 'White Sneakers',  shape: 'sneakers',  colors: ['#F2EFEA', '#D8D2C8'], starter: true, tags: ['casual', 'sporty'] },
  { id: 'sh_sneak_rose',  kind: 'wear', category: 'shoes', ar: 'سنيكرز وردي', en: 'Rose Sneakers',   shape: 'sneakers',  colors: ['#EEA9BB', '#FFFFFF'], tags: ['casual', 'soft'] },
  { id: 'sh_boots_choco', kind: 'wear', category: 'shoes', ar: 'بوت بني', en: 'Chocolate Boots',     shape: 'boots',     colors: ['#6B4632', '#523425'], rarity: 'rare', tags: ['cozy', 'casual'] },
  { id: 'sh_boots_black', kind: 'wear', category: 'shoes', ar: 'بوت أسود', en: 'Black Boots',        shape: 'boots',     colors: ['#2A2430', '#1C1822'], rarity: 'rare', tags: ['bold'] },
  { id: 'sh_flats_nude',  kind: 'wear', category: 'shoes', ar: 'باليرينا نيود', en: 'Nude Flats',    shape: 'flats',     colors: ['#DEC0AE', '#C7A794'], tags: ['formal', 'soft'] },
  { id: 'sh_mary_navy',   kind: 'wear', category: 'shoes', ar: 'حذاء مدرسي', en: 'Navy Mary Janes',  shape: 'mary_janes',colors: ['#3A4468', '#2A3252'], rarity: 'rare', tags: ['formal'] },
  { id: 'sh_sandals_gold',kind: 'wear', category: 'shoes', ar: 'صندل ذهبي', en: 'Gold Sandals',      shape: 'sandals',   colors: ['#D9B063', '#BE9448'], rarity: 'epic', tags: ['formal', 'bold'], level: 8 },
]

// ============================================================
// الإكسسوارات
// ============================================================

const ACCESSORIES: Def[] = [
  { id: 'ac_glasses_round', kind: 'wear', category: 'accessory', ar: 'نظارة دائرية', en: 'Round Glasses',  shape: 'glasses',    colors: ['#3A3244', '#3A3244'], tags: ['casual', 'soft'] },
  { id: 'ac_headphones',    kind: 'wear', category: 'accessory', ar: 'سماعات', en: 'Headphones',           shape: 'headphones', colors: ['#E4738F', '#3A3244'], rarity: 'rare', tags: ['casual', 'bold'] },
  { id: 'ac_clip_star',     kind: 'wear', category: 'accessory', ar: 'توكة نجمة', en: 'Star Clip',         shape: 'hairclip',   colors: ['#F0C86E', '#D9AE50'], tags: ['soft', 'dreamy'] },
  { id: 'ac_earrings_pearl',kind: 'wear', category: 'accessory', ar: 'حلق لؤلؤ', en: 'Pearl Earrings',     shape: 'earrings',   colors: ['#F4EFE6'], rarity: 'rare', tags: ['formal', 'soft'] },
  { id: 'ac_beanie_rust',   kind: 'wear', category: 'accessory', ar: 'بونيه', en: 'Rust Beanie',           shape: 'beanie',     colors: ['#B5715A', '#965944'], rarity: 'rare', tags: ['cozy'] },
  { id: 'ac_scarf_plaid',   kind: 'wear', category: 'accessory', ar: 'كوفية', en: 'Plaid Scarf',           shape: 'scarf',      colors: ['#A6566A', '#8A4055'], rarity: 'rare', tags: ['cozy', 'seasonal'] },
  { id: 'ac_necklace_moon', kind: 'wear', category: 'accessory', ar: 'سلسلة قمر', en: 'Moon Necklace',     shape: 'necklace',   colors: ['#D9C07A', '#F0DFA8'], rarity: 'epic', tags: ['dreamy'], level: 10 },
  { id: 'ac_tote_canvas',   kind: 'wear', category: 'accessory', ar: 'شنطة قماش', en: 'Canvas Tote',       shape: 'tote',       colors: ['#D8CBB4', '#BFB098'], tags: ['casual'] },
]

// ============================================================
// أسطح الغرفة
// ============================================================

const SURFACES: Def[] = [
  { id: 'wall_blush',   kind: 'surface', category: 'wall',  ar: 'حائط وردي', en: 'Blush Wall',      shape: 'flat', colors: ['#E9C6CD'], starter: true, tags: ['soft'] },
  { id: 'wall_sage',    kind: 'surface', category: 'wall',  ar: 'حائط ساج', en: 'Sage Wall',        shape: 'flat', colors: ['#BCCDB8'], tags: ['cozy'] },
  { id: 'wall_lilac',   kind: 'surface', category: 'wall',  ar: 'حائط ليلكي', en: 'Lilac Wall',     shape: 'flat', colors: ['#CFC3E8'], tags: ['dreamy'] },
  { id: 'wall_cream',   kind: 'surface', category: 'wall',  ar: 'حائط كريمي', en: 'Cream Wall',     shape: 'flat', colors: ['#F0E6D6'], tags: ['soft'] },
  { id: 'wall_terra',   kind: 'surface', category: 'wall',  ar: 'حائط تراكوتا', en: 'Terracotta Wall',shape:'flat', colors: ['#D9A188'], rarity: 'rare', tags: ['cozy', 'bold'] },
  { id: 'wall_stars',   kind: 'surface', category: 'wall',  ar: 'حائط نجوم', en: 'Starlit Wall',    shape: 'stars',colors: ['#3A3163', '#F0DFA8'], rarity: 'epic', tags: ['dreamy'], level: 9 },
  { id: 'floor_oak',    kind: 'surface', category: 'floor', ar: 'أرضية خشب', en: 'Oak Floor',       shape: 'wood', colors: ['#C49A6C', '#AC8459'], starter: true, tags: ['cozy'] },
  { id: 'floor_ash',    kind: 'surface', category: 'floor', ar: 'أرضية رمادية', en: 'Ash Floor',    shape: 'wood', colors: ['#A9A2A8', '#918B92'], tags: ['soft'] },
  { id: 'floor_walnut', kind: 'surface', category: 'floor', ar: 'أرضية جوز', en: 'Walnut Floor',    shape: 'wood', colors: ['#8A5F3E', '#734E32'], rarity: 'rare', tags: ['cozy'] },
  { id: 'floor_marble', kind: 'surface', category: 'floor', ar: 'أرضية رخام', en: 'Marble Floor',   shape: 'tile', colors: ['#EDE9E4', '#D6D0C8'], rarity: 'epic', tags: ['formal'], level: 12 },
]

// ============================================================
// أثاث الغرفة
// ============================================================

const ROOM: Def[] = [
  { id: 'bed_cozy_cream', kind: 'room', category: 'bed',   ar: 'سرير كريمي', en: 'Cream Bed',     shape: 'bed_soft',  colors: ['#E8DCCA', '#CFBFA8', '#F2A0B8'], starter: true, tags: ['cozy'] },
  { id: 'bed_canopy',     kind: 'room', category: 'bed',   ar: 'سرير بستارة', en: 'Canopy Bed',   shape: 'bed_canopy',colors: ['#D9C7E4', '#BFA9CE', '#F4EDE0'], rarity: 'epic', tags: ['dreamy'], level: 8 },
  { id: 'bed_loft',       kind: 'room', category: 'bed',   ar: 'سرير علوي', en: 'Loft Bed',       shape: 'bed_loft',  colors: ['#A8B8C8', '#8D9DAD', '#F0E6DA'], rarity: 'rare', tags: ['bold'], level: 5 },
  { id: 'desk_study',     kind: 'room', category: 'desk',  ar: 'مكتب دراسة', en: 'Study Desk',    shape: 'desk_plain',colors: ['#C49A6C', '#A87F55'], starter: true, tags: ['cozy'] },
  { id: 'desk_vanity',    kind: 'room', category: 'desk',  ar: 'تسريحة', en: 'Vanity Table',      shape: 'desk_vanity',colors:['#EFD8DE', '#D9B8C2', '#F0DFA8'], rarity: 'rare', tags: ['soft'], level: 4 },
  { id: 'desk_creator',   kind: 'room', category: 'desk',  ar: 'مكتب إبداع', en: 'Creator Desk',  shape: 'desk_creator',colors:['#3E3854','#8C7BC4','#F0C86E'], rarity: 'epic', tags: ['bold'], level: 10 },
  { id: 'rug_round_rose', kind: 'room', category: 'rug',   ar: 'سجادة وردية', en: 'Rose Round Rug',shape: 'rug_round', colors: ['#E9BCC6', '#D49FAD'], tags: ['soft'] },
  { id: 'rug_boho',       kind: 'room', category: 'rug',   ar: 'سجادة بوهو', en: 'Boho Rug',      shape: 'rug_rect',  colors: ['#D3A88A', '#A87256'], rarity: 'rare', tags: ['cozy'] },
  { id: 'plant_monstera', kind: 'room', category: 'plant', ar: 'نبتة مونستيرا', en: 'Monstera',   shape: 'plant_big', colors: ['#5E8F62', '#C98A6A'], tags: ['cozy'] },
  { id: 'plant_hanging',  kind: 'room', category: 'plant', ar: 'نبتة معلقة', en: 'Hanging Ivy',   shape: 'plant_hang',colors: ['#6FA173', '#D9CBB6'], rarity: 'rare', tags: ['soft'] },
  { id: 'poster_band',    kind: 'room', category: 'poster',ar: 'بوستر فرقة', en: 'Band Poster',   shape: 'poster_a',  colors: ['#3A3244', '#E4738F'], tags: ['bold'] },
  { id: 'poster_moon',    kind: 'room', category: 'poster',ar: 'بوستر قمر', en: 'Moon Poster',    shape: 'poster_b',  colors: ['#2E2A4A', '#F0DFA8'], rarity: 'rare', tags: ['dreamy'] },
  { id: 'shelf_books',    kind: 'room', category: 'shelf', ar: 'رف كتب', en: 'Book Shelf',        shape: 'shelf_a',   colors: ['#C49A6C', '#E4738F', '#8CC2AE'], tags: ['cozy'] },
  { id: 'shelf_display',  kind: 'room', category: 'shelf', ar: 'رف عرض', en: 'Display Shelf',     shape: 'shelf_b',   colors: ['#EFE3D2', '#D9B063'], rarity: 'rare', tags: ['soft'], level: 6 },
  { id: 'lamp_arc',       kind: 'room', category: 'lamp',  ar: 'أباجورة', en: 'Arc Lamp',         shape: 'lamp_arc',  colors: ['#D9C07A', '#3A3244'], tags: ['cozy'] },
  { id: 'lamp_neon',      kind: 'room', category: 'lamp',  ar: 'نيون', en: 'Neon Sign',           shape: 'lamp_neon', colors: ['#FF6E9C', '#9B8CFF'], rarity: 'epic', tags: ['bold', 'dreamy'], level: 11 },
  { id: 'lamp_stars',     kind: 'room', category: 'lamp',  ar: 'إضاءة نجوم', en: 'String Lights', shape: 'lamp_string',colors:['#F5D98A', '#F5C97A'], rarity: 'rare', tags: ['dreamy'], level: 3 },
]

// ============================================================
// المصدر النهائي
// ============================================================

export const ITEMS: GameItem[] = build([
  ...TOPS, ...BOTTOMS, ...DRESSES, ...SHOES, ...ACCESSORIES, ...SURFACES, ...ROOM,
])

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]))

export function getItem(id: string): GameItem | undefined {
  return BY_ID.get(id)
}

export function itemsByCategory(category: string): GameItem[] {
  return ITEMS.filter((i) => i.category === category)
}

export function itemsByKind(kind: ItemKind): GameItem[] {
  return ITEMS.filter((i) => i.kind === kind)
}

/** العناصر الممنوحة مجانًا عند بدء اللعب. */
export const STARTER_ITEM_IDS = ITEMS.filter((i) => i.starter).map((i) => i.id)

/** يجمع أوسمة الأسلوب للإطلالة الحالية — يستخدمه محرك القصص (DECISIONS.md#D-003). */
export function outfitTags(worn: Partial<Record<string, string>>): Set<StyleTag> {
  const tags = new Set<StyleTag>()
  for (const id of Object.values(worn)) {
    if (!id) continue
    const item = getItem(id)
    item?.tags.forEach((t) => tags.add(t))
  }
  return tags
}

/** أعلى ندرة مرتداة — تستخدمه الشخصيات للتعليق على القطع المميزة. */
export function topRarity(worn: Partial<Record<string, string>>): Rarity {
  const order: Rarity[] = ['common', 'rare', 'epic', 'legendary']
  let best = 0
  for (const id of Object.values(worn)) {
    if (!id) continue
    const item = getItem(id)
    if (item) best = Math.max(best, order.indexOf(item.rarity))
  }
  return order[best]
}
