"""
مصدر الحقيقة الوحيد لكتالوج الأزياء.

الكتالوج هنا لأنه بيربط حاجتين لازم يفضلوا متطابقين:
1. **إعدادات التصيير** — أي شكل هندسي وأي لون
2. **بيانات اللعبة** — الاسم والندرة والسعر والأوسمة

لو اتفصلوا، بيحصل انحراف: عنصر في اللعبة بلا صورة، أو صورة بلا عنصر.
`gen_catalog.py` بيولّد ملف TypeScript من هنا، فاللعبة والتصيير بيقروا
من نفس المصدر.

الألوان بمدى 0..1 (فضاء Blender الخطي تقريبًا).
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Item:
    id: str
    category: str            # top | bottom | dress | shoes | accessory
    shape: str               # مفتاح في garments.CATALOG
    color: tuple[float, float, float]
    ar: str
    en: str
    rarity: str = 'common'
    tags: list[str] = field(default_factory=lambda: ['casual'])
    starter: bool = False
    level: int | None = None
    season: str | None = None


ITEMS: list[Item] = [
    # ---------------- علوي ----------------
    Item('top_tee_cream',  'top', 'tee',        (0.90, 0.84, 0.74), 'تيشيرت كريمي', 'Cream Tee', starter=True, tags=['casual', 'soft']),
    Item('top_tee_rose',   'top', 'tee',        (0.86, 0.48, 0.58), 'تيشيرت وردي', 'Rose Tee', tags=['casual', 'soft']),
    Item('top_tee_ink',    'top', 'tee',        (0.14, 0.12, 0.17), 'تيشيرت أسود', 'Ink Tee', tags=['casual', 'bold']),
    Item('top_crop_sage',  'top', 'tee_crop',   (0.60, 0.70, 0.58), 'كروب ساج', 'Sage Crop', rarity='rare', tags=['casual']),
    Item('top_tank_ivory', 'top', 'tank',       (0.92, 0.89, 0.82), 'توب عاجي', 'Ivory Tank', tags=['casual', 'sporty']),
    Item('top_blouse_pearl','top','blouse',     (0.94, 0.91, 0.85), 'بلوزة لؤلؤية', 'Pearl Blouse', rarity='rare', tags=['formal', 'soft']),
    Item('top_blouse_wine','top', 'blouse',     (0.42, 0.16, 0.24), 'بلوزة نبيتي', 'Wine Blouse', rarity='rare', tags=['formal', 'bold'], level=5),
    Item('top_sweater_oat','top', 'sweater',    (0.82, 0.73, 0.60), 'سويتر بيج', 'Oat Sweater', tags=['cozy', 'soft']),
    Item('top_sweater_moss','top','sweater',    (0.36, 0.44, 0.30), 'سويتر أخضر', 'Moss Sweater', rarity='rare', tags=['cozy']),
    Item('top_hoodie_lilac','top','hoodie',     (0.68, 0.60, 0.86), 'هودي ليلكي', 'Lilac Hoodie', rarity='rare', tags=['cozy', 'dreamy']),
    Item('top_hoodie_grey','top', 'hoodie',     (0.52, 0.50, 0.56), 'هودي رمادي', 'Grey Hoodie', tags=['cozy', 'sporty']),
    Item('top_cardigan_blush','top','cardigan', (0.90, 0.72, 0.78), 'كارديجان وردي', 'Blush Cardigan', rarity='rare', tags=['cozy', 'soft']),
    Item('top_jacket_denim','top','jacket',     (0.36, 0.46, 0.62), 'جاكيت جينز', 'Denim Jacket', rarity='rare', tags=['casual', 'bold']),
    Item('top_jacket_night','top','jacket',     (0.20, 0.18, 0.34), 'جاكيت ليلي', 'Midnight Jacket', rarity='epic', tags=['bold', 'dreamy'], level=10),

    # ---------------- سفلي ----------------
    Item('bot_jeans_classic','bottom','jeans',       (0.32, 0.40, 0.55), 'جينز كلاسيك', 'Classic Jeans', starter=True),
    Item('bot_jeans_black', 'bottom','jeans',        (0.15, 0.14, 0.18), 'جينز أسود', 'Black Jeans', tags=['casual', 'bold']),
    Item('bot_joggers_grey','bottom','joggers',      (0.46, 0.45, 0.50), 'جوجر رمادي', 'Grey Joggers', tags=['cozy', 'sporty']),
    Item('bot_joggers_rose','bottom','joggers',      (0.82, 0.62, 0.68), 'جوجر وردي', 'Rose Joggers', rarity='rare', tags=['cozy', 'soft']),
    Item('bot_wide_ivory',  'bottom','wide_pants',   (0.90, 0.86, 0.78), 'بنطلون واسع', 'Ivory Wide-Leg', rarity='rare', tags=['formal', 'soft'], level=6),
    Item('bot_shorts_denim','bottom','shorts',       (0.44, 0.54, 0.68), 'شورت جينز', 'Denim Shorts', tags=['casual', 'sporty']),
    Item('bot_skirt_cream', 'bottom','skirt_a',      (0.90, 0.85, 0.75), 'جيبة كريمي', 'Cream Skirt', tags=['soft', 'formal']),
    Item('bot_skirt_navy',  'bottom','skirt_pleated',(0.22, 0.27, 0.42), 'جيبة كحلي', 'Navy Pleats', rarity='rare', tags=['formal']),
    Item('bot_skirt_plaid', 'bottom','skirt_pleated',(0.60, 0.32, 0.38), 'جيبة كاروهات', 'Plaid Skirt', rarity='rare', tags=['casual', 'bold']),
    Item('bot_skirt_midi',  'bottom','skirt_midi',   (0.34, 0.30, 0.40), 'جيبة ميدي', 'Midi Skirt', rarity='rare', tags=['formal'], level=7),

    # ---------------- فساتين ----------------
    Item('dr_sun_butter',  'dress', 'sundress',     (0.92, 0.84, 0.58), 'فستان صيفي', 'Butter Sundress', tags=['soft', 'casual']),
    Item('dr_sun_mint',    'dress', 'sundress',     (0.62, 0.84, 0.74), 'فستان نعناعي', 'Mint Sundress', rarity='rare', tags=['soft']),
    Item('dr_day_rose',    'dress', 'day_dress',    (0.84, 0.50, 0.58), 'فستان وردي', 'Rose Day Dress', rarity='rare', tags=['casual', 'soft']),
    Item('dr_hoodie_grey', 'dress', 'hoodie_dress', (0.50, 0.48, 0.54), 'فستان هودي', 'Hoodie Dress', rarity='rare', tags=['cozy', 'casual']),
    Item('dr_party_night', 'dress', 'party_dress',  (0.20, 0.17, 0.36), 'فستان ليلي', 'Midnight Dress', rarity='epic', tags=['formal', 'dreamy'], level=9),
    Item('dr_gown_gold',   'dress', 'gown',         (0.72, 0.56, 0.26), 'فستان ذهبي', 'Gilded Gown', rarity='legendary', tags=['formal', 'bold'], level=15),

    # ---------------- أحذية ----------------
    Item('sh_sneak_white', 'shoes', 'sneakers',   (0.92, 0.91, 0.88), 'سنيكرز أبيض', 'White Sneakers', starter=True, tags=['casual', 'sporty']),
    Item('sh_sneak_rose',  'shoes', 'sneakers',   (0.88, 0.62, 0.70), 'سنيكرز وردي', 'Rose Sneakers', tags=['casual', 'soft']),
    Item('sh_flats_nude',  'shoes', 'flats',      (0.80, 0.68, 0.60), 'باليرينا نيود', 'Nude Flats', tags=['formal', 'soft']),
    Item('sh_boots_choco', 'shoes', 'boots',      (0.32, 0.22, 0.16), 'بوت بني', 'Chocolate Boots', rarity='rare', tags=['cozy', 'casual']),
    Item('sh_boots_black', 'shoes', 'boots_tall', (0.13, 0.12, 0.15), 'بوت أسود طويل', 'Black Tall Boots', rarity='epic', tags=['bold'], level=8),
]

# ---------------- الشعر ----------------
HAIR_STYLES = {
    'long_wavy':     ('شعر طويل موّج', 'Long Wavy'),
    'long_straight': ('شعر طويل ناعم', 'Long Straight'),
    'long_curly':    ('شعر كيرلي', 'Long Curly'),
    'shoulder':      ('لطول الكتف', 'Shoulder Length'),
    'bob':           ('بوب', 'Bob'),
    'pixie':         ('بيكسي', 'Pixie'),
}

HAIR_COLORS = {
    'black':    ((0.030, 0.024, 0.030), 'أسود', 'Black'),
    'espresso': ((0.085, 0.048, 0.033), 'بني غامق', 'Espresso'),
    'chestnut': ((0.170, 0.085, 0.048), 'كستنائي', 'Chestnut'),
    'caramel':  ((0.320, 0.180, 0.080), 'كراميل', 'Caramel'),
    'honey':    ((0.520, 0.340, 0.150), 'عسلي', 'Honey Blonde'),
    'platinum': ((0.760, 0.700, 0.620), 'بلاتيني', 'Platinum'),
    'auburn':   ((0.330, 0.090, 0.055), 'نحاسي', 'Auburn'),
    'rose':     ((0.720, 0.300, 0.420), 'وردي', 'Rose'),
    'lilac':    ((0.480, 0.360, 0.720), 'ليلكي', 'Lilac'),
    'mint':     ((0.240, 0.620, 0.480), 'نعناعي', 'Mint'),
}

# ---------------- درجات البشرة (الهوية — مجانية دائمًا) ----------------
SKIN_TONES = {
    'porcelain': ('#EFC6AC', '#C77E74', 'فاتح', 'Porcelain'),
    'sand':      ('#E0AC84', '#C06E68', 'فاتح دافي', 'Sand'),
    'honey':     ('#C2854F', '#C4665F', 'حنطي', 'Honey'),
    'golden':    ('#AC7040', '#B0555A', 'قمحي', 'Golden'),
    'olive':     ('#8C5730', '#A8484F', 'زيتي', 'Olive'),
    'bronze':    ('#74451F', '#953F48', 'برونزي', 'Bronze'),
    'cocoa':     ('#5C3520', '#8E3F44', 'بني', 'Cocoa'),
    'espresso':  ('#3E2216', '#71303A', 'داكن', 'Espresso'),
}

EYE_COLORS = {
    'brown': ((0.175, 0.092, 0.042), 'بني', 'Brown'),
    'amber': ((0.280, 0.150, 0.045), 'عسلي', 'Amber'),
    'green': ((0.090, 0.135, 0.100), 'أخضر', 'Green'),
    'blue':  ((0.070, 0.095, 0.145), 'أزرق', 'Blue'),
    'grey':  ((0.110, 0.118, 0.135), 'رمادي', 'Grey'),
    'hazel': ((0.150, 0.115, 0.055), 'ندي', 'Hazel'),
}

RARITY_PRICE = {
    'common':    ('coins', 160),
    'rare':      ('coins', 480),
    'epic':      ('gems', 24),
    'legendary': ('gems', 60),
}


def by_id(item_id: str) -> Item | None:
    for it in ITEMS:
        if it.id == item_id:
            return it
    return None
