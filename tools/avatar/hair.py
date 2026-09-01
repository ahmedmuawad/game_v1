"""
شعر مبني كقشرة مشتقة من الجمجمة.

لماذا مشتقة وليست شبكة مستقلة: لأن الشعر لازم يلبس الجمجمة بالظبط مهما
تغيّر شكل الوجه. باشتقاقه من نفس الشبكة المعلَّمة، أي تعديل في الرأس
بينعكس على كل التسريحات تلقائيًا — وده اللي بيخلي إضافة تسريحة جديدة
تكلفتها دوال، مش نمذجة يدوية.
"""
from __future__ import annotations
import numpy as np
from meshlib import UVSphere, falloff

TAU = np.pi * 2


def _scalp_base(nu: int = 128, nv: int = 100) -> UVSphere:
    """يعيد بناء شكل الجمجمة الأساسي (بدون نحت الملامح) كأساس للشعر."""
    s = UVSphere(nu=nu, nv=nv)
    s.verts[:, 2] *= 0.489
    s.cranium_profile(half_height=0.489, exponent_top=2.55, exponent_bottom=2.10)
    s.verts[:, 0] *= 0.395
    s.verts[:, 1] *= 0.404
    s.scale_band(z_center=0.16, z_radius=0.28, sx=1.030, sy=1.020)
    back = 1.0 - s.front
    s.verts[:, 1] += back ** 2 * 0.052
    return s


def _hairline(x: np.ndarray, front: np.ndarray, style: str) -> np.ndarray:
    """
    ارتفاع خط الشعر عند كل رأس.
    أعلى في منتصف الجبهة (مع نتوء خفيف)، وينزل عند الصدغين وخلف الأذن.
    """
    ax = np.abs(x)
    # الجبهة: خط الشعر عند z ≈ 0.24، ينزل للصدغين
    fore = 0.245 - 0.10 * np.clip((ax - 0.16) / 0.22, 0, 1) ** 1.4
    # نتوء خفيف في المنتصف (widow's peak)
    fore -= 0.022 * np.exp(-(ax / 0.055) ** 2)
    # الجوانب والخلف: خط الشعر أنزل بكثير
    side_back = -0.16
    if style == 'pixie':
        fore += 0.02
        side_back = -0.06
    return fore * front + side_back * (1.0 - front)


def _thickness(front: np.ndarray, z: np.ndarray, style: str) -> np.ndarray:
    """حجم الشعر — أكبر عند القمة والخلف، أقل عند خط الشعر."""
    base = 0.030 + 0.026 * np.clip((z + 0.20) / 0.70, 0, 1) ** 0.8
    if style in ('curly', 'afro'):
        base = 0.062 + 0.040 * np.clip((z + 0.20) / 0.70, 0, 1) ** 0.7
    if style == 'pixie':
        base = 0.024 + 0.014 * np.clip((z + 0.20) / 0.70, 0, 1)
    # الخلف أكثر امتلاءً
    return base * (1.0 + 0.30 * (1.0 - front))


def build_cap(style: str = 'long', wave: float = 0.0, seed: int = 3):
    """قشرة فروة الرأس — الجزء اللي بيغطي الجمجمة."""
    s = _scalp_base()
    verts = s.verts.copy()
    front = s.front
    x, z = verts[:, 0], verts[:, 2]

    line = _hairline(x, front, style)
    inside = z > line                       # داخل منطقة الشعر
    # تلاشٍ ناعم عند الحافة عشان الشعر ما يبقاش مقطوع بحدّ حاد
    edge = np.clip((z - line) / 0.045, 0.0, 1.0)
    edge = edge * edge * (3 - 2 * edge)

    t = _thickness(front, z, style) * edge
    # تخفيف الإزاحة عند القطب — الاتجاه الشعاعي بيتلاقى هناك وبينتج نتوء
    t *= 1.0 - 0.55 * np.clip((z - 0.34) / 0.16, 0, 1) ** 1.5
    if wave > 0:
        theta = s.theta
        t += wave * 0.012 * np.sin(theta * 7.0) * np.sin((z + 0.5) * 11.0) * edge

    # الإزاحة على امتداد المتجه الشعاعي من مركز الجمجمة
    radial = verts - np.array([0.0, 0.02, 0.05])
    radial /= np.maximum(np.linalg.norm(radial, axis=1, keepdims=True), 1e-6)
    verts = verts + radial * t[:, None]

    # حذف الأوجه خارج منطقة الشعر
    keep = inside
    faces = [f for f in s.faces() if all(keep[i] for i in f)]
    return verts, faces, s


def _open_shell(outer: np.ndarray, inner: np.ndarray, n_u: int, n_rows: int):
    """
    يبني جسمًا مصمتًا من سطحين (خارجي وداخلي) بخياطة الحواف الحرة.

    ضروري لأن الشعر شريط مفتوح حول الوجه: سطح بلا سماكة بيبان
    كورقة من الجانب ويفقد كل مصداقيته عند أي دوران للكاميرا.
    """
    verts = np.concatenate([outer, inner], axis=0)
    off = len(outer)
    idx = lambda r, c: r * n_u + c
    faces = []
    for r in range(n_rows - 1):
        for c in range(n_u - 1):
            faces.append((idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)))
            faces.append((off + idx(r, c + 1), off + idx(r, c),
                          off + idx(r + 1, c), off + idx(r + 1, c + 1)))
    # الحافتان الجانبيتان (عند الوجه)
    for r in range(n_rows - 1):
        for c in (0, n_u - 1):
            a, b = idx(r, c), idx(r + 1, c)
            if c == 0:
                faces.append((a, b, off + b, off + a))
            else:
                faces.append((off + a, off + b, b, a))
    # الحافة السفلى (أطراف الشعر)
    for c in range(n_u - 1):
        a, b = idx(n_rows - 1, c), idx(n_rows - 1, c + 1)
        faces.append((a, b, off + b, off + a))
    # الحافة العليا (تحت القبعة)
    for c in range(n_u - 1):
        a, b = idx(0, c), idx(0, c + 1)
        faces.append((off + a, off + b, b, a))
    return verts, faces


# مقاطع صورة الشعر الجانبية: (z, نصف العرض, نصف العمق, إزاحة أمامية)
_LENGTH_PROFILES: dict[str, list[tuple[float, float, float, float]]] = {
    'long': [
        (0.300, 0.300, 0.330, 0.010),
        (0.160, 0.392, 0.418, 0.010),
        (0.020, 0.418, 0.438, 0.006),
        (-0.180, 0.424, 0.436, -0.004),
        (-0.460, 0.430, 0.430, -0.020),
        (-0.760, 0.436, 0.418, -0.038),
        (-1.060, 0.428, 0.396, -0.056),
        (-1.320, 0.386, 0.352, -0.074),
        (-1.480, 0.300, 0.276, -0.086),
        (-1.560, 0.196, 0.184, -0.092),
    ],
    'bob': [
        (0.300, 0.300, 0.330, 0.010),
        (0.160, 0.392, 0.418, 0.010),
        (0.000, 0.424, 0.444, 0.004),
        (-0.180, 0.440, 0.452, -0.006),
        (-0.340, 0.446, 0.446, -0.018),
        (-0.470, 0.420, 0.412, -0.030),
        (-0.540, 0.352, 0.344, -0.038),
    ],
    'pixie': [
        (0.300, 0.300, 0.330, 0.010),
        (0.160, 0.388, 0.412, 0.008),
        (0.020, 0.404, 0.424, 0.002),
        (-0.110, 0.398, 0.412, -0.008),
        (-0.200, 0.356, 0.366, -0.016),
        (-0.250, 0.290, 0.298, -0.022),
    ],
    'curly': [
        (0.300, 0.320, 0.348, 0.012),
        (0.160, 0.436, 0.456, 0.012),
        (0.000, 0.492, 0.502, 0.006),
        (-0.240, 0.520, 0.518, -0.008),
        (-0.520, 0.528, 0.512, -0.026),
        (-0.800, 0.508, 0.484, -0.046),
        (-1.020, 0.446, 0.424, -0.062),
        (-1.160, 0.336, 0.320, -0.074),
        (-1.240, 0.216, 0.206, -0.080),
    ],
}


def build_length(style: str = 'long', length: float = 1.0, wave: float = 0.35,
                 seed: int = 5, gap: float = 0.60):
    """
    الجزء المتدلّي من الشعر.

    شريط **مفتوح** يلتف من صدغ لصدغ مرورًا بالخلف — مش أنبوب مقفول.
    الفجوة الأمامية (`gap`) هي اللي بتسيب الوش مكشوف؛ من غيرها الشعر
    بيغطي الوجه بالكامل.
    """
    prof = _LENGTH_PROFILES.get(style, _LENGTH_PROFILES['long'])
    zs = np.array([p[0] for p in prof])
    ws = np.array([p[1] for p in prof])
    ds = np.array([p[2] for p in prof])
    fs = np.array([p[3] for p in prof])

    # تمديد/تقصير الطول مع تثبيت الجزء الملامس للجمجمة
    z_top = zs[0]
    zs_scaled = np.where(zs > 0.16, zs, 0.16 + (zs - 0.16) * length)

    n_rows, n_u = 52, 72
    zz = np.linspace(z_top, zs_scaled[-1], n_rows)
    order = np.argsort(zs_scaled)
    w = np.interp(zz, zs_scaled[order], ws[order])
    d = np.interp(zz, zs_scaled[order], ds[order])
    f = np.interp(zz, zs_scaled[order], fs[order])

    # القوس: مركزه الخلف (theta = +pi/2)، ويترك فجوة أمام الوجه
    span = np.pi - gap
    uu = np.linspace(-span, span, n_u)
    theta = np.pi / 2 + uu

    rng = np.random.default_rng(seed)
    strand_phase = rng.uniform(0, TAU, 6)

    def surface(thick: float) -> np.ndarray:
        pts = []
        for i, z in enumerate(zz):
            drop = np.clip((0.16 - z) / 1.0, 0, 1)
            # تموّج: خصلات رأسية بترددات مختلفة، تزيد مع النزول
            ripple = np.zeros_like(theta)
            for k, ph in enumerate(strand_phase):
                fr = 3.0 + k * 2.0
                ripple += np.sin(theta * fr + ph + z * (2.0 + k)) / (k + 2.0)
            ripple *= wave * 0.026 * np.clip(drop * 1.4, 0, 1)
            # الأطراف تتجمع للداخل قليلًا
            taper = 1.0 - 0.10 * np.clip((uu / span) ** 2, 0, 1) * drop
            rw = (w[i] + thick + ripple) * taper
            rd = (d[i] + thick + ripple) * taper
            x = np.cos(theta) * rw
            y = np.sin(theta) * rd + f[i] + drop * 0.030
            pts.append(np.stack([x, y, np.full(n_u, z)], axis=1))
        return np.concatenate(pts, axis=0)

    outer = surface(0.020)
    inner = surface(-0.016)
    return _open_shell(outer, inner, n_u, n_rows)


def build_bangs(kind: str = 'side', seed: int = 11):
    """
    غُرّة كشريط ينساب على الجبهة.

    مهمة أسلوبيًا: بتكسر مساحة الجبهة الكبيرة اللي بتخلي الرأس يبان طويل،
    وهي أكتر عنصر بيميّز التسريحات عن بعض عند هذا الجمهور.
    """
    if kind == 'none':
        return np.zeros((0, 3)), []

    n_u, n_rows = 56, 20
    # القوس الأمامي فقط
    span = 1.30
    uu = np.linspace(-span, span, n_u)
    theta = -np.pi / 2 + uu          # -pi/2 = مواجهة الوجه

    z_start = 0.250                  # خط الشعر
    if kind == 'blunt':
        z_end = 0.150 - 0.030 * np.cos(uu * 1.1)
        sweep = np.zeros_like(uu)
    elif kind == 'curtain':
        z_end = 0.060 + 0.130 * np.exp(-(uu / 0.42) ** 2)
        sweep = np.sign(uu) * 0.030 * np.clip(np.abs(uu) / span, 0, 1)
    else:  # side — الغُرّة الجانبية
        z_end = 0.135 - 0.085 * np.tanh((uu + 0.45) * 1.5)
        sweep = 0.045 * np.tanh((uu + 0.45) * 1.2)

    tt = np.linspace(0.0, 1.0, n_rows)

    def surface(thick: float) -> np.ndarray:
        pts = []
        for t in tt:
            z = z_start + (z_end - z_start) * (t ** 1.15)
            # نصف قطر يتبع الجمجمة ويتباعد قليلًا مع النزول
            rw = (0.369 + thick + 0.030 * t) * np.sqrt(np.maximum(1 - (z / 0.62) ** 2, 0.12))
            rd = (0.396 + thick + 0.026 * t) * np.sqrt(np.maximum(1 - (z / 0.62) ** 2, 0.12))
            x = np.cos(theta) * rw + sweep * t
            y = np.sin(theta) * rd - 0.012 * t
            pts.append(np.stack([x, y, z], axis=1))
        return np.concatenate(pts, axis=0)

    outer = surface(0.030)
    inner = surface(0.004)
    return _open_shell(outer, inner, n_u, n_rows)


STYLES: dict[str, dict] = {
    'long_straight': dict(cap='long', length=1.0, wave=0.12, bangs='curtain'),
    'long_wavy':     dict(cap='long', length=1.0, wave=0.60, bangs='side'),
    'long_curly':    dict(cap='curly', length=0.92, wave=1.05, bangs='side'),
    'bob':           dict(cap='bob', length=1.0, wave=0.22, bangs='blunt'),
    'pixie':         dict(cap='pixie', length=1.0, wave=0.18, bangs='side'),
}
