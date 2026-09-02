"""
توليد أيقونة التطبيق وشاشة البداية.

الأيقونة الافتراضية اللي بيحطها Capacitor هي شعار Capacitor نفسه —
مقبول أثناء التطوير، ومرفوض في إصدار على المتجر: أول حاجة بتشوفها
اللاعبة في درج التطبيقات هي أيقونة منتج تاني.

بنولّد بدل ما نصمّم يدويًا عشان نفس السبب اللي خلّى الأثاث إجرائي:
تغيير لون أو شكل بيبقى تعديل سطر وإعادة تشغيل، لا جولة تصدير كاملة من
أداة تصميم.

    python tools/brand/make_icons.py
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

# ألوان الهوية — مطابِقة لـ--g-primary في design/tokens.css
PINK = (255, 92, 138)
VIOLET = (167, 139, 232)
INK = (14, 9, 20)
CREAM = (255, 246, 250)

# مقاسات أندرويد القياسية للأيقونة
MIPMAP = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

# شاشة البداية — عرض × ارتفاع لكل كثافة
SPLASH = {
    'port': {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280),
             'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)},
    'land': {'mdpi': (480, 320), 'hdpi': (800, 480), 'xhdpi': (1280, 720),
             'xxhdpi': (1600, 960), 'xxxhdpi': (1920, 1280)},
}

SS = 4  # عامل التنعيم: نرسم بأربعة أضعاف وننزّل


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def diagonal_gradient(size: int, c0, c1) -> Image.Image:
    """تدرّج قطري — نفس اتجاه --g-primary في نظام التصميم."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(c0, c1, t)
    return img


def spark(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill, points: int = 4,
          inner: float = 0.34) -> None:
    """
    نجمة رباعية بأطراف مقعّرة — نفس شكل IconSpark في التطبيق.
    الشكل ده هو علامة المنتج البصرية في كل مكان (الاحتفالات، الأونبوردنج،
    نداء القصة)، فالأيقونة بتستخدمه عشان الدرج والتطبيق يتقروا كحاجة واحدة.
    """
    pts = []
    for i in range(points * 2):
        ang = (math.pi / points) * i - math.pi / 2
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    d.polygon(pts, fill=fill)


def build_icon(size: int) -> Image.Image:
    S = size * SS
    base = diagonal_gradient(S, PINK, VIOLET).convert('RGBA')

    # قناع دائري: أندرويد بيقصّ الأيقونة بأشكال مختلفة حسب المشغّل،
    # والدايرة هي الشكل الوحيد اللي بيطلع سليم تحت كل الأقنعة.
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)

    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # وهج ناعم خلف النجمة
    d.ellipse((S * 0.16, S * 0.10, S * 0.90, S * 0.84), fill=(255, 255, 255, 26))
    spark(d, S * 0.5, S * 0.47, S * 0.33, CREAM + (255,))
    spark(d, S * 0.70, S * 0.72, S * 0.11, CREAM + (200,))

    out = Image.alpha_composite(base, layer)
    out.putalpha(mask)
    return out.resize((size, size), Image.LANCZOS)


def build_foreground(size: int) -> Image.Image:
    """
    الطبقة الأمامية للأيقونة التكيّفية.
    أندرويد بيقصّ 33% من كل ناحية، فالرمز لازم يقعد في الـ66% الوسطانية
    وإلا هيتقص أطرافه على أجهزة بأقنعة دائرية.
    """
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    spark(d, S * 0.5, S * 0.5, S * 0.22, CREAM + (255,))
    spark(d, S * 0.635, S * 0.645, S * 0.075, CREAM + (210,))
    return img.resize((size, size), Image.LANCZOS)


def build_splash(w: int, h: int) -> Image.Image:
    SW, SH = w * 2, h * 2
    img = Image.new('RGB', (SW, SH), INK)

    """
    الوهج بتمويه حقيقي لا بأشكال متراكبة.
    تكديس بيضاويات نصف شفافة بيسيب حافة قوسية حادة عند حدود أكبر شكل —
    باينة بوضوح على شاشة كبيرة. التمويه الجاوسي بيدّي تدرّجًا فعليًا.
    """
    glow = Image.new('RGB', (SW, SH), INK)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-SW * 0.35, -SH * 0.34, SW * 1.35, SH * 0.30), fill=VIOLET)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=SW * 0.13))
    img = Image.blend(img, glow, 0.42)

    d = ImageDraw.Draw(img, 'RGBA')
    cx, cy = SW / 2, SH / 2
    r = min(SW, SH) * 0.11
    d.ellipse((cx - r * 1.7, cy - r * 1.7, cx + r * 1.7, cy + r * 1.7), fill=(*PINK, 30))
    spark(d, cx, cy, r, (*CREAM, 255))
    spark(d, cx + r * 0.62, cy + r * 0.66, r * 0.30, (*CREAM, 205))

    return img.resize((w, h), Image.LANCZOS)


def main() -> None:
    n = 0
    for folder, size in MIPMAP.items():
        out = RES / folder
        out.mkdir(parents=True, exist_ok=True)
        icon = build_icon(size)
        icon.save(out / 'ic_launcher.png')
        icon.save(out / 'ic_launcher_round.png')
        build_foreground(size).save(out / 'ic_launcher_foreground.png')
        n += 3

    for orient, sizes in SPLASH.items():
        for dpi, (w, h) in sizes.items():
            out = RES / f'drawable-{orient}-{dpi}'
            out.mkdir(parents=True, exist_ok=True)
            build_splash(w, h).save(out / 'splash.png')
            n += 1

    # النسخة الافتراضية في drawable/
    (RES / 'drawable').mkdir(parents=True, exist_ok=True)
    build_splash(480, 800).save(RES / 'drawable' / 'splash.png')
    n += 1

    # أيقونة المتجر 512×512 — مطلوبة في Play Console.
    # مربّعة مليانة لا دائرية: Play بيعمل التدوير بنفسه، ودايرة بشفافية
    # بتطلع دايرة صغيرة وسط مربّع أبيض في قوائم المتجر.
    store = ROOT / 'store'
    store.mkdir(exist_ok=True)
    S = 512 * SS
    sq = diagonal_gradient(S, PINK, VIOLET).convert('RGBA')
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((S * 0.16, S * 0.10, S * 0.90, S * 0.84), fill=(255, 255, 255, 26))
    spark(d, S * 0.5, S * 0.47, S * 0.30, CREAM + (255,))
    spark(d, S * 0.70, S * 0.71, S * 0.10, CREAM + (200,))
    Image.alpha_composite(sq, layer).convert('RGB')         .resize((512, 512), Image.LANCZOS).save(store / 'icon-512.png')
    n += 1

    print(f'{n} files generated')


if __name__ == '__main__':
    main()
