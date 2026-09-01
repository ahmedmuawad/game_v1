"""
توليد خريطة نسيج الوجه برمجيًا.

الهندسة لوحدها مش كفاية: وجه بلون واحد بيتقري كتمثال جبس مهما كان النحت
دقيق. اللي بيحوّله لشخصية هو تنوّع اللون — شفايف، احمرار الخد، تظليل
المحجر، ودفء طرف الأنف.

الخريطة بتتولّد في فضاء (u,v) للكرة UV نفسها، فالتطابق مع الهندسة مضمون.
"""
from __future__ import annotations
import numpy as np

# ثوابت لازم تطابق head.py
HALF_W, HALF_D, HALF_H = 0.378, 0.404, 0.500
BROW_Z, EYE_Z = 0.105, 0.005
NOSE_TIP_Z, MOUTH_Z, CHIN_Z = -0.175, -0.305, -0.455
EYE_X = 0.150


def _hex(c: str) -> np.ndarray:
    c = c.lstrip('#')
    return np.array([int(c[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def _blend(base: np.ndarray, color: np.ndarray, mask: np.ndarray) -> np.ndarray:
    return base * (1 - mask[..., None]) + color[None, None, :] * mask[..., None]


def _ellipse(X, Z, cx, cz, rx, rz, softness=0.5, power=1.0):
    """قناع بيضاوي ناعم في فضاء الوجه."""
    d = np.sqrt(((X - cx) / max(rx, 1e-6)) ** 2 + ((Z - cz) / max(rz, 1e-6)) ** 2)
    inner = 1.0 - softness
    m = np.clip((1.0 - d) / max(softness, 1e-6) + inner, 0.0, 1.0)
    m = m * m * (3 - 2 * m)
    return m ** power


def build_face_texture(
    skin_hex: str,
    lip_hex: str,
    *,
    size: int = 1024,
    blush: float = 1.0,
    freckles: bool = False,
    seed: int = 7,
) -> np.ndarray:
    """
    ترجع مصفوفة RGB بأبعاد (size, size, 3) بقيم 0..1، جاهزة للتحميل في Blender.
    إحداثيات UV: u = theta / 2π  ·  v = 1 - phi / π
    """
    skin = _hex(skin_hex)
    lip = _hex(lip_hex)

    # اشتقاق تدرّجات البشرة من اللون الأساسي — بيضمن التناسق مع أي درجة
    warm = np.clip(skin * np.array([1.045, 0.955, 0.925]), 0, 1)   # مناطق دافئة (خد، أنف، أذن)
    cool = np.clip(skin * np.array([0.965, 0.985, 1.030]), 0, 1)   # مناطق باردة (جبهة، صدغ)
    shade = np.clip(skin * 0.760, 0, 1)                            # ظل ذاتي
    deep = np.clip(skin * 0.620, 0, 1)

    u = (np.arange(size) + 0.5) / size
    v = (np.arange(size) + 0.5) / size
    U, V = np.meshgrid(u, v, indexing='xy')

    theta = U * 2 * np.pi
    phi = (1.0 - V) * np.pi

    sp = np.sin(phi)
    X = sp * np.cos(theta) * HALF_W
    Z = np.cos(phi) * HALF_H
    FRONT = np.clip(-np.sin(theta), 0.0, 1.0)      # 1 على الوجه، 0 على المؤخرة
    face = FRONT ** 1.6

    img = np.repeat(np.repeat(skin[None, None, :], size, 0), size, 1)

    # ---- تدرّج عام: جبهة أبرد، فك أدفأ ----
    fore = _ellipse(X, Z, 0.0, 0.28, 0.34, 0.20, 0.9)
    img = _blend(img, cool, fore * 0.35 * face)
    jaw = _ellipse(X, Z, 0.0, -0.36, 0.30, 0.16, 0.9)
    img = _blend(img, warm, jaw * 0.22 * face)

    # ---- احمرار الخدين ----
    if blush > 0:
        for sx in (1, -1):
            m = _ellipse(X, Z, sx * 0.205, -0.115, 0.135, 0.105, 0.95, power=1.4)
            img = _blend(img, np.clip(skin * np.array([1.10, 0.86, 0.86]), 0, 1),
                         m * 0.34 * blush * face)

    # ---- دفء طرف الأنف والأذنين ----
    img = _blend(img, warm, _ellipse(X, Z, 0.0, NOSE_TIP_Z, 0.075, 0.055, 0.9) * 0.30 * face)
    # تظليل جانبي الأنف — بيرفع الأنف بصريًا
    for sx in (1, -1):
        m = _ellipse(X, Z, sx * 0.052, NOSE_TIP_Z + 0.055, 0.030, 0.085, 0.95)
        img = _blend(img, shade, m * 0.24 * face)

    # ---- تظليل المحجر (يخلق عمق العين) ----
    for sx in (1, -1):
        m = _ellipse(X, Z, sx * EYE_X, EYE_Z + 0.030, 0.105, 0.062, 0.95, power=1.2)
        img = _blend(img, shade, m * 0.32 * face)
        # الزاوية الداخلية أغمق
        m2 = _ellipse(X, Z, sx * 0.082, EYE_Z + 0.010, 0.042, 0.048, 0.95)
        img = _blend(img, deep, m2 * 0.26 * face)
        # هالة رقيقة تحت العين
        m3 = _ellipse(X, Z, sx * EYE_X, EYE_Z - 0.072, 0.090, 0.032, 0.95)
        img = _blend(img, shade, m3 * 0.14 * face)

    # ملاحظة: الحاجب هندسي بالكامل (head.build_brow). بيضاوي مسطّح هنا كان
    # بيتعارض مع قوس الهندسة وينتج نظرة غاضبة.

    # ---- الشفاه ----
    # الشفة العليا: قوسان صغيران
    upper = np.maximum(
        _ellipse(X, Z, 0.026, MOUTH_Z + 0.020, 0.042, 0.021, 0.72),
        _ellipse(X, Z, -0.026, MOUTH_Z + 0.020, 0.042, 0.021, 0.72),
    )
    upper = np.maximum(upper, _ellipse(X, Z, 0.0, MOUTH_Z + 0.010, 0.066, 0.017, 0.72))
    lower = _ellipse(X, Z, 0.0, MOUTH_Z - 0.028, 0.068, 0.029, 0.72)
    lips = np.clip(np.maximum(upper, lower), 0, 1)
    img = _blend(img, lip, lips * 0.92 * face)
    # الشفة السفلى أفتح (ضوء)، والعليا أغمق (في الظل)
    img = _blend(img, np.clip(lip * 1.22, 0, 1), lower * 0.34 * face)
    img = _blend(img, np.clip(lip * 0.72, 0, 1), upper * 0.30 * face)
    # خط الفم
    line = _ellipse(X, Z, 0.0, MOUTH_Z - 0.001, 0.068, 0.0065, 0.6)
    img = _blend(img, np.clip(lip * 0.42, 0, 1), line * 0.80 * face)

    # ---- تظليل تحت الفك وخلف الرأس ----
    under = _ellipse(X, Z, 0.0, -0.50, 0.40, 0.14, 0.95)
    img = _blend(img, shade, under * 0.30)
    img = _blend(img, shade, (1.0 - FRONT) ** 2 * 0.18)

    # ---- نمش اختياري ----
    if freckles:
        rng = np.random.default_rng(seed)
        spots = np.zeros((size, size))
        for _ in range(150):
            cx = rng.uniform(-0.26, 0.26)
            cz = rng.uniform(-0.20, -0.02)
            if abs(cx) < 0.045 and cz < NOSE_TIP_Z:
                continue
            spots = np.maximum(spots, _ellipse(X, Z, cx, cz,
                                               rng.uniform(0.006, 0.011),
                                               rng.uniform(0.006, 0.011), 0.9))
        img = _blend(img, np.clip(skin * np.array([0.80, 0.66, 0.58]), 0, 1),
                     spots * 0.42 * face)

    return np.clip(img, 0.0, 1.0)


def sphere_uvs(nu: int, nv: int) -> list[tuple[float, float]]:
    """
    إحداثيات UV مطابقة لترتيب رؤوس UVSphere.
    لازم تتولّد بنفس ترتيب الحلقات في meshlib.UVSphere.
    """
    uvs = []
    for r in range(nv):
        v = 1.0 - r / (nv - 1)
        for c in range(nu):
            uvs.append((c / nu, v))
    return uvs
