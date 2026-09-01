"""
شعر مفصّل على الشبكة الأساسية.

الطريقة: الشعر مشتق من رؤوس فروة الرأس نفسها ومُزاح على امتداد
المتجهات الناظمية. النتيجة إن الشعر بيلبس الجمجمة بالظبط مهما اتغيّر
شكل الرأس أو النسب — وإضافة تسريحة جديدة بتبقى ضبط دوال، مش نمذجة.
"""
from __future__ import annotations
import numpy as np

TAU = np.pi * 2


def vertex_normals(verts: np.ndarray, faces: list) -> np.ndarray:
    """متجهات ناظمية لكل رأس (متوسط ناظميات الأوجه المجاورة)."""
    n = np.zeros_like(verts)
    for f in faces:
        if len(f) < 3:
            continue
        a, b, c = verts[f[0]], verts[f[1]], verts[f[2]]
        fn = np.cross(b - a, c - a)
        for i in f:
            n[i] += fn
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(ln, 1e-12)


class Scalp:
    """يستخرج فروة الرأس من شبكة الجسم بحسب خط شعر قابل للضبط."""

    def __init__(self, verts: np.ndarray, faces: list, rig):
        self.verts = verts
        self.faces = faces
        self.rig = rig
        self.normals = vertex_normals(verts, faces)
        u = rig.inter
        self.u = u
        self.crown = float(verts[:, 2].max())
        self.eye_z = float(rig.eye_mid[2])
        self.center = np.array([0.0, rig.eye_mid[1] + u * 0.55, self.eye_z + u * 0.55])

    def hairline(self, x: np.ndarray, y: np.ndarray, bangs: str = 'side') -> np.ndarray:
        """
        ارتفاع خط الشعر.

        الغُرّة مدمجة هنا كانخفاض في خط الشعر الأمامي — مش شريط منفصل.
        الشريط المنفصل بيطلع زي حافة قبعة لأنه بيبدأ من سطح الجمجمة
        بزاوية حادة؛ أما خفض خط الشعر فبيخلي الغُرّة تنمو من الفروة طبيعيًا.
        """
        u = self.u
        ax = np.abs(x)
        front = np.clip((self.center[1] - y) / (u * 1.30), 0, 1)
        front = front * front * (3 - 2 * front)

        # خط الشعر الأساسي على الجبهة
        fore = self.eye_z + u * 1.02 - u * 0.55 * np.clip((ax - u * 0.55) / (u * 1.00), 0, 1) ** 1.3
        fore -= u * 0.12 * np.exp(-(ax / (u * 0.24)) ** 2)

        # انخفاض الغُرّة — يبقى دائمًا فوق خط العين
        floor = self.eye_z + u * 0.46
        if bangs == 'blunt':
            drop = u * 0.42 * np.ones_like(ax)
        elif bangs == 'curtain':
            drop = u * 0.50 * np.clip((ax - u * 0.18) / (u * 0.9), 0, 1) ** 0.8
        elif bangs == 'side':
            drop = u * 0.46 * np.clip((x + u * 0.9) / (u * 2.0), 0, 1) ** 0.9
        else:
            drop = np.zeros_like(ax)
        fore = np.maximum(fore - drop, floor)

        back = self.eye_z - u * 1.55
        return fore * front + back * (1.0 - front)

    def cap(self, thickness: float = 0.18, volume: float = 1.0, bangs: str = 'side'):
        """
        قشرة فروة الرأس، شاملة الغُرّة.

        الإزاحة على امتداد الناظمي بمقدار متلاشٍ عند خط الشعر، فالحافة
        بتخفّ تدريجيًا بدل ما تتقطع بحدّ حاد.
        """
        v, f, n = self.verts, self.faces, self.normals
        u = self.u
        line = self.hairline(v[:, 0], v[:, 1], bangs)
        inside = v[:, 2] > line
        edge = np.clip((v[:, 2] - line) / (u * 0.34), 0, 1)
        edge = edge * edge * (3 - 2 * edge)

        top = np.clip((v[:, 2] - self.eye_z) / (self.crown - self.eye_z + 1e-9), 0, 1)
        back = np.clip((v[:, 1] - self.center[1]) / (u * 1.4), 0, 1)
        t = u * thickness * volume * (0.50 + 0.80 * top + 0.40 * back) * edge
        out = v + n * t[:, None]

        # كنس الغُرّة للأمام قليلًا عند الحافة السفلى (حركة طبيعية)
        if bangs != 'none':
            sweep = (1.0 - edge) * (v[:, 2] > line).astype(float)
            fr = np.clip((self.center[1] - v[:, 1]) / (u * 1.2), 0, 1)
            out[:, 1] -= sweep * fr * u * 0.16
            if bangs == 'side':
                out[:, 0] += sweep * fr * u * 0.20

        faces = [fc for fc in f if all(inside[i] for i in fc)]
        return out, faces

    def ellipse_profile(self, n_levels: int = 24):
        """
        نصف عرض ونصف عمق الجمجمة عند مستويات ارتفاع متتالية.

        بنقيس رقمين لكل مستوى (أقصى |x| وأقصى |y|) ونستوفيهم بنعومة، بدل
        أخذ نصف قطر لكل زاوية على حدة. أخذ عيّنات لكل زاوية بينتج تعرّجات
        لأن العيّنات مشوّشة — والبيضاوي الناعم بيوصف الجمجمة كويس أصلًا.
        """
        u = self.u
        z_top = self.crown
        z_bot = self.eye_z - u * 1.05
        zs = np.linspace(z_top, z_bot, n_levels)
        half_w = np.zeros(n_levels)
        half_d = np.zeros(n_levels)
        band = u * 0.42
        for i, z in enumerate(zs):
            m = np.abs(self.verts[:, 2] - z) < band
            if m.sum() < 12:
                half_w[i] = half_w[i - 1] if i else u * 1.2
                half_d[i] = half_d[i - 1] if i else u * 1.3
                continue
            sel = self.verts[m]
            half_w[i] = np.abs(sel[:, 0]).max()
            half_d[i] = np.abs(sel[:, 1] - self.center[1]).max()
        # تنعيم بمرشح متوسط متحرك — يزيل أي قفزات متبقية
        k = np.array([0.15, 0.22, 0.26, 0.22, 0.15])
        pad = lambda a: np.concatenate([a[:2][::-1], a, a[-2:][::-1]])
        half_w = np.convolve(pad(half_w), k, mode='valid')
        half_d = np.convolve(pad(half_d), k, mode='valid')
        return zs, half_w, half_d


def _open_shell(outer, inner, n_u, n_rows):
    verts = np.concatenate([outer, inner], axis=0)
    off = len(outer)
    idx = lambda r, c: r * n_u + c
    faces = []
    for r in range(n_rows - 1):
        for c in range(n_u - 1):
            faces.append((idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)))
            faces.append((off + idx(r, c + 1), off + idx(r, c),
                          off + idx(r + 1, c), off + idx(r + 1, c + 1)))
    for r in range(n_rows - 1):
        for c in (0, n_u - 1):
            a, b = idx(r, c), idx(r + 1, c)
            faces.append((a, b, off + b, off + a) if c == 0 else (off + a, off + b, b, a))
    for c in range(n_u - 1):
        a, b = idx(n_rows - 1, c), idx(n_rows - 1, c + 1)
        faces.append((a, b, off + b, off + a))
    for c in range(n_u - 1):
        a, b = idx(0, c), idx(0, c + 1)
        faces.append((off + a, off + b, b, a))
    return verts, faces


# طول الشعر ونفشته بوحدة المسافة بين العينين
LENGTH_STYLES: dict[str, dict] = {
    'long_straight': dict(drop=7.2, flare=1.10, wave=0.16, taper=0.42, gap=1.55),
    'long_wavy':     dict(drop=7.0, flare=1.20, wave=0.62, taper=0.46, gap=1.50),
    'long_curly':    dict(drop=6.0, flare=1.40, wave=1.05, taper=0.55, gap=1.40),
    'bob':           dict(drop=2.6, flare=1.14, wave=0.24, taper=0.72, gap=1.35),
    'shoulder':      dict(drop=4.4, flare=1.14, wave=0.42, taper=0.55, gap=1.45),
    'pixie':         dict(drop=1.2, flare=1.05, wave=0.20, taper=0.80, gap=1.30),
}


def length(scalp: Scalp, style: str = 'long_wavy', seed: int = 5):
    """الجزء المتدلّي: شريط مفتوح بسماكة يلتف من صدغ لصدغ عبر الخلف."""
    cfg = LENGTH_STYLES.get(style, LENGTH_STYLES['long_wavy'])
    u = scalp.u
    n_rows, n_u = 58, 84
    gap = cfg['gap']

    zs_ref, hw_ref, hd_ref = scalp.ellipse_profile()

    z_top = scalp.eye_z + u * 1.30
    z_bot = scalp.eye_z - u * cfg['drop']
    zz = np.linspace(z_top, z_bot, n_rows)

    # تحت الجمجمة نثبّت المقطع على آخر قيمة (الشعر بينسدل مش بيتبع الرقبة)
    order = np.argsort(zs_ref)
    hw = np.interp(zz, zs_ref[order], hw_ref[order])
    hd = np.interp(zz, zs_ref[order], hd_ref[order])
    below = zz < zs_ref.min()
    hw[below] = hw_ref[np.argmin(zs_ref)]
    hd[below] = hd_ref[np.argmin(zs_ref)]

    drop = np.clip((z_top - zz) / max(z_top - z_bot, 1e-9), 0, 1)
    flare = 1.0 + (cfg['flare'] - 1.0) * np.sin(np.clip(drop, 0, 1) * np.pi * 0.72)
    tip = 1.0 - cfg['taper'] * np.clip((drop - 0.70) / 0.30, 0, 1) ** 1.7
    k = flare * tip

    span = np.pi - gap
    uu = np.linspace(-span, span, n_u)
    theta = np.pi / 2 + uu

    rng = np.random.default_rng(seed)
    phases = rng.uniform(0, TAU, 5)

    # ترفيع السماكة عند طرفي القوس (ناحية الوجه): من غيره الشعر بيبان
    # كلوحين مسطحين مقطوعين بحدّ حاد
    end_taper = 1.0 - 0.90 * np.clip((np.abs(uu) - span * 0.62) / (span * 0.38), 0, 1) ** 1.4

    def surface(thick: float) -> np.ndarray:
        pts = []
        for i in range(n_rows):
            ripple = np.zeros(n_u)
            for m, ph in enumerate(phases):
                ripple += np.sin(theta * (3.0 + m * 2.0) + ph + drop[i] * (7.0 + m * 3.0)) / (m + 2.0)
            ripple *= cfg['wave'] * u * 0.11 * drop[i] * end_taper
            rw = hw[i] * k[i] + thick * u * end_taper + ripple
            rd = hd[i] * k[i] + thick * u * end_taper + ripple
            x = np.cos(theta) * rw
            y = np.sin(theta) * rd + scalp.center[1] + drop[i] * u * 0.22
            # الأطراف تنسحب للخلف كل ما نزلنا: الشعر بينسدل ورا الكتف
            pull = (1.0 - end_taper) * drop[i] * u * 1.05
            y = y + pull
            pts.append(np.stack([x, y, np.full(n_u, zz[i])], axis=1))
        return np.concatenate(pts, axis=0)

    return _open_shell(surface(0.13), surface(-0.055), n_u, n_rows)


def bangs(scalp: Scalp, kind: str = 'side'):
    """
    غُرّة: بتكسر مساحة الجبهة وهي أكتر عنصر بيميّز التسريحات.

    قيد صارم: الحافة السفلى لا تنزل تحت `eye_z + 0.45u` أبدًا — غُرّة
    بتغطي العين بتلغي كل تعابير الوجه اللي بنيناها.
    """
    if kind == 'none':
        return np.zeros((0, 3)), []
    u = scalp.u
    n_u, n_rows = 64, 20
    span = 1.22
    uu = np.linspace(-span, span, n_u)
    theta = -np.pi / 2 + uu

    zs_ref, hw_ref, hd_ref = scalp.ellipse_profile()
    order = np.argsort(zs_ref)

    z_start = scalp.eye_z + u * 1.06
    floor = scalp.eye_z + u * 0.45          # الحد الأدنى المطلق
    if kind == 'blunt':
        z_end = scalp.eye_z + u * 0.62 - u * 0.10 * np.cos(uu * 1.15)
        sweep = np.zeros_like(uu)
    elif kind == 'curtain':
        z_end = scalp.eye_z + u * 0.50 + u * 0.55 * np.exp(-(uu / 0.44) ** 2)
        sweep = np.sign(uu) * u * 0.30 * np.clip(np.abs(uu) / span, 0, 1)
    else:  # side
        z_end = scalp.eye_z + u * 0.86 - u * 0.40 * np.tanh((uu + 0.40) * 1.35)
        sweep = u * 0.36 * np.tanh((uu + 0.40) * 1.15)
    z_end = np.maximum(z_end, floor)

    tt = np.linspace(0.0, 1.0, n_rows)

    def surface(thick: float) -> np.ndarray:
        pts = []
        for t in tt:
            z = z_start + (z_end - z_start) * (t ** 1.10)
            hw = np.interp(z, zs_ref[order], hw_ref[order])
            hd = np.interp(z, zs_ref[order], hd_ref[order])
            g = 1.0 + 0.06 * t
            rw = hw * g + thick * u
            rd = hd * g + thick * u
            x = np.cos(theta) * rw + sweep * t
            y = np.sin(theta) * rd + scalp.center[1] - u * 0.06 * t
            pts.append(np.stack([x, y, z], axis=1))
        return np.concatenate(pts, axis=0)

    return _open_shell(surface(0.17), surface(0.03), n_u, n_rows)


# تركيبة كل تسريحة: طول + غُرّة + حجم فروة الرأس
STYLES: dict[str, dict] = {
    'long_straight': dict(length='long_straight', bangs='curtain', volume=0.95),
    'long_wavy':     dict(length='long_wavy',     bangs='side',    volume=1.05),
    'long_curly':    dict(length='long_curly',    bangs='side',    volume=1.30),
    'bob':           dict(length='bob',           bangs='blunt',   volume=1.05),
    'shoulder':      dict(length='shoulder',      bangs='curtain', volume=1.00),
    'pixie':         dict(length='pixie',         bangs='side',    volume=0.85),
}
