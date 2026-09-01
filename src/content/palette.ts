import type { LocalizedText } from '@/i18n/types'

/** خيار لوني معروض للاعب. */
export interface ColorOption {
  id: string
  name: LocalizedText
  /** اللون الأساسي. */
  base: string
  /** ظل أغمق للتظليل. */
  shade: string
  /** إضاءة أفتح. */
  light: string
}

/**
 * درجات البشرة — التنوع التمثيلي شرط لا ميزة (PRODUCT_BLUEPRINT §9).
 * ثماني درجات موزّعة عبر الطيف، لا ثلاث درجات فاتحة.
 */
export const SKIN_TONES: ColorOption[] = [
  { id: 'skin1', name: { ar: 'فاتح', en: 'Porcelain' },  base: '#F7DDCB', shade: '#E5BFA6', light: '#FFF0E5' },
  { id: 'skin2', name: { ar: 'فاتح دافي', en: 'Sand' },  base: '#F0C9A8', shade: '#D9A981', light: '#FFE3CB' },
  { id: 'skin3', name: { ar: 'حنطي', en: 'Honey' },      base: '#E0AC80', shade: '#C08A5D', light: '#F6CBA4' },
  { id: 'skin4', name: { ar: 'قمحي', en: 'Golden' },     base: '#CE9061', shade: '#AC7143', light: '#E8B183' },
  { id: 'skin5', name: { ar: 'زيتي', en: 'Olive' },      base: '#B2764B', shade: '#8E5A34', light: '#D0966A' },
  { id: 'skin6', name: { ar: 'برونزي', en: 'Bronze' },   base: '#955C36', shade: '#734224', light: '#B47A4F' },
  { id: 'skin7', name: { ar: 'بني', en: 'Cocoa' },       base: '#71432A', shade: '#54301C', light: '#8F5B3D' },
  { id: 'skin8', name: { ar: 'داكن', en: 'Espresso' },   base: '#4E2C1B', shade: '#361C0F', light: '#6B4029' },
]

/** ألوان الشعر — طبيعية + ألوان تعبيرية (مهمة جدًا لهذا الجمهور). */
export const HAIR_COLORS: ColorOption[] = [
  { id: 'h_black',   name: { ar: 'أسود', en: 'Black' },       base: '#1E1922', shade: '#0E0B12', light: '#3A3242' },
  { id: 'h_espresso',name: { ar: 'بني غامق', en: 'Espresso' },base: '#3A2419', shade: '#231409', light: '#573A2A' },
  { id: 'h_chestnut',name: { ar: 'كستنائي', en: 'Chestnut' }, base: '#6B3F26', shade: '#4B2916', light: '#8D5B3C' },
  { id: 'h_caramel', name: { ar: 'كراميل', en: 'Caramel' },   base: '#A8703C', shade: '#83522A', light: '#C8935B' },
  { id: 'h_honey',   name: { ar: 'عسلي', en: 'Honey Blonde' },base: '#D6A257', shade: '#B07F3C', light: '#EDC384' },
  { id: 'h_platinum',name: { ar: 'بلاتيني', en: 'Platinum' }, base: '#E4DCD1', shade: '#BFB4A6', light: '#F7F2EA' },
  { id: 'h_auburn',  name: { ar: 'نحاسي', en: 'Auburn' },     base: '#9B3B2A', shade: '#75291B', light: '#BE5A45' },
  { id: 'h_rose',    name: { ar: 'وردي', en: 'Rose' },        base: '#E77398', shade: '#BE4E74', light: '#F79BB6' },
  { id: 'h_lilac',   name: { ar: 'ليلكي', en: 'Lilac' },      base: '#A48BE0', shade: '#7E66BA', light: '#C2AEF0' },
  { id: 'h_mint',    name: { ar: 'نعناعي', en: 'Mint' },      base: '#6FCFB0', shade: '#48A98A', light: '#98E5CC' },
  { id: 'h_sky',     name: { ar: 'سماوي', en: 'Sky' },        base: '#6FA8E0', shade: '#4A82BA', light: '#96C6F0' },
  { id: 'h_plum',    name: { ar: 'برقوقي', en: 'Plum' },      base: '#6C3D6E', shade: '#4B2650', light: '#8E5A90' },
]

export const EYE_COLORS: ColorOption[] = [
  { id: 'e_brown', name: { ar: 'بني', en: 'Brown' },   base: '#5A3A22', shade: '#3A2312', light: '#7C5636' },
  { id: 'e_dark',  name: { ar: 'عسلي', en: 'Amber' },  base: '#9A6A2E', shade: '#734C1C', light: '#BE8B4A' },
  { id: 'e_green', name: { ar: 'أخضر', en: 'Green' },  base: '#3F7A5A', shade: '#28563D', light: '#5C9D78' },
  { id: 'e_blue',  name: { ar: 'أزرق', en: 'Blue' },   base: '#3C6C9E', shade: '#254B76', light: '#5A8FC2' },
  { id: 'e_grey',  name: { ar: 'رمادي', en: 'Grey' },  base: '#5E6472', shade: '#3F4451', light: '#828A9A' },
  { id: 'e_hazel', name: { ar: 'ندي', en: 'Hazel' },   base: '#7A6032', shade: '#584219', light: '#9C7E4E' },
]

export const LIP_COLORS: ColorOption[] = [
  { id: 'l_nude',   name: { ar: 'نيود', en: 'Nude' },     base: '#C98878', shade: '#A96A5C', light: '#E0A797' },
  { id: 'l_rose',   name: { ar: 'وردي', en: 'Rose' },     base: '#D9748A', shade: '#B4536A', light: '#EE95A8' },
  { id: 'l_berry',  name: { ar: 'توتي', en: 'Berry' },    base: '#A8455F', shade: '#822F45', light: '#C4657E' },
  { id: 'l_coral',  name: { ar: 'مرجاني', en: 'Coral' },  base: '#E4796A', shade: '#BE594B', light: '#F59B8D' },
  { id: 'l_cherry', name: { ar: 'كرزي', en: 'Cherry' },   base: '#C2364B', shade: '#991F33', light: '#DB5A6D' },
]

export function findColor(list: ColorOption[], id: string): ColorOption {
  return list.find((c) => c.id === id) ?? list[0]
}
