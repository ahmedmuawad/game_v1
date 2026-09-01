"""
توليد الملابس برمجيًا.

الفكرة المحورية: **القطعة مش شبكة منفصلة — هي منطقة من جلد الجسم
مُزاحة للخارج.** النتيجة:

1. القطعة بتتفصّل على المقاس تلقائيًا مهما اتغيّرت نسب الشخصية.
2. إضافة قطعة جديدة = تعريف قناع + سماكة + لون. مش نمذجة يدوية.
   وده اللي بيخلي وتيرة المحتوى (نزول عناصر جديدة باستمرار) ممكنة أصلًا —
   وهي أساس خطة الاحتفاظ.

الاستثناء الوحيد: الجيبات والفساتين المنسدلة. دي بتبتعد عن الجسم فبتتبني
كسطح مُدار (loft) من مقاطع بيضاوية.

كل الارتفاعات بوحدة طول الجسم (الطول الكلي = 1.0).
"""
from __future__ import annotations
import numpy as np
from meshutil import (vertex_normals, dist_to_polyline, region_shell, smoothstep)

TAU = np.pi * 2


class BodyRig:
    """معالم الجسم اللازمة لتفصيل الملابس."""

    def __init__(self, base, verts: np.ndarray):
        self.verts = verts
        J = {}
        for name, faces in base.mesh.groups.items():
            if name.startswith('joint-'):
                idx = sorted({i for f in faces for i in f})
                J[name[6:]] = verts[idx].mean(0)
        self.J = J

        faces = base.mesh.group_faces('body')
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        self.body_idx = np.array(used, dtype=int)
        self.bv = verts[used]
        self.bf = [tuple(remap[i] for i in f) for f in faces]
        self.bn = vertex_normals(self.bv, self.bf)

        # محاور الأطراف.
        # المحور بيمتد بعد مفصل اليد: الأصابع بتمتد أبعد من المفصل، ولو
        # المحور وقف عنده بتفضل خارج قناع الذراع — وساعتها قياس محيط
        # الخصر بيرجّع عرض الأيدي (في وقفة A-pose الأيدي على ارتفاع الخصر).
        self.arm = {}
        for s in ('l', 'r'):
            sh, el, ha = J[f'{s}-shoulder'], J[f'{s}-elbow'], J[f'{s}-hand']
            tip = ha + (ha - el) * 0.85
            self.arm[s] = [sh, el, ha, tip]
        self.leg = {
            s: [J[f'{s}-upper-leg'], J[f'{s}-knee'], J[f'{s}-ankle']] for s in ('l', 'r')
        }

        # ارتفاعات مرجعية
        self.z_neck = float(J['neck'][2])
        self.z_shoulder = float(J['l-shoulder'][2])
        self.z_chest = float(J['spine-1'][2])
        self.z_waist = float(J['spine-3'][2])
        self.z_hip = float(J['pelvis'][2])
        self.z_knee = float(J['l-knee'][2])
        self.z_ankle = float(J['l-ankle'][2])

        self._arm_cache: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        self._leg_cache: dict[str, tuple[np.ndarray, np.ndarray]] = {}

    # ---- أقنعة ----
    def arm_ds(self, side: str):
        if side not in self._arm_cache:
            self._arm_cache[side] = dist_to_polyline(self.bv, self.arm[side])
        return self._arm_cache[side]

    def leg_ds(self, side: str):
        if side not in self._leg_cache:
            self._leg_cache[side] = dist_to_polyline(self.bv, self.leg[side])
        return self._leg_cache[side]

    def arm_length(self, side: str) -> float:
        p = self.arm[side]
        return float(np.linalg.norm(p[1] - p[0]) + np.linalg.norm(p[2] - p[1]))

    def leg_length(self, side: str) -> float:
        p = self.leg[side]
        return float(np.linalg.norm(p[1] - p[0]) + np.linalg.norm(p[2] - p[1]))

    def is_arm(self, radius: float = 0.080) -> np.ndarray:
        """قناع ناعم لمنطقة الذراعين (باستثناء الكتف نفسه)."""
        out = np.zeros(len(self.bv))
        for s in ('l', 'r'):
            d, arc = self.arm_ds(s)
            near = smoothstep((radius - d) / (radius * 0.55))
            past_shoulder = smoothstep((arc - 0.020) / 0.030)
            out = np.maximum(out, near * past_shoulder)
        return out

    def is_leg(self, radius: float = 0.075) -> np.ndarray:
        out = np.zeros(len(self.bv))
        for s in ('l', 'r'):
            d, _ = self.leg_ds(s)
            out = np.maximum(out, smoothstep((radius - d) / (radius * 0.5)))
        return out

    def z_band(self, z_lo: float, z_hi: float, fade: float = 0.018) -> np.ndarray:
        z = self.bv[:, 2]
        return smoothstep((z - z_lo) / fade) * smoothstep((z_hi - z) / fade)


# ============================================================
# القطع العلوية
# ============================================================

SLEEVE = {'none': 0.0, 'cap': 0.09, 'short': 0.30, 'elbow': 0.52, 'long': 0.92}
NECK = {'crew': 0.030, 'scoop': 0.062, 'v': 0.070, 'high': 0.008}


def build_top(rig: BodyRig, *, hem: float, sleeve: str = 'short', neck: str = 'crew',
              thickness: float = 0.0125, hem_thicken: float = 1.35,
              drape: float = 1.0) -> tuple[np.ndarray, list]:
    """
    قطعة علوية: الجذع من خط الرقبة حتى الحاشية، بأكمام اختيارية.

    `hem` = ارتفاع الحاشية بوحدة طول الجسم (0.58 ≈ تحت الخصر، 0.66 ≈ كروب)
    """
    bv, bn = rig.bv, rig.bn
    z = bv[:, 2]
    y = bv[:, 1]

    # خط الرقبة: أوطى من الأمام وأعلى من الخلف.
    # لازم يتلاشى ناحية الكتفين: لو نزل عندهم بيفتح شقًا فوق الكتف —
    # وده كان أوضح عيب في أول نسخة.
    drop = NECK.get(neck, 0.030)
    front = smoothstep((rig.J['neck'][1] - y) / 0.045)
    center = smoothstep((0.075 - np.abs(bv[:, 0])) / 0.045)
    neck_z = rig.z_shoulder + 0.030 - drop * front * center
    if neck == 'v':
        neck_z -= 0.045 * front * smoothstep((0.040 - np.abs(bv[:, 0])) / 0.040)

    torso = smoothstep((z - hem) / 0.022) * smoothstep((neck_z - z) / 0.020)

    # الأكمام
    sleeve_frac = SLEEVE.get(sleeve, 0.30)
    arm_w = np.zeros(len(bv))
    if sleeve_frac > 0:
        for s in ('l', 'r'):
            d, arc = rig.arm_ds(s)
            L = rig.arm_length(s)
            near = smoothstep((0.068 - d) / 0.044)
            within = smoothstep((sleeve_frac * L - arc) / (0.055 * L))
            arm_w = np.maximum(arm_w, near * within)

    # الجذع مطروحًا منه الذراع العارية، متحدًا مع الكم.
    # الاتحاد (max) ضروري: أي طرح عند الكتف بيفتح شقًا لأن المنطقة
    # دي بتخص الجذع والذراع في نفس الوقت.
    arm_mask = rig.is_arm()
    bare_arm = np.clip(arm_mask - arm_w, 0, 1)
    w = np.clip(np.maximum(torso - bare_arm, arm_w * smoothstep((neck_z - z) / 0.024)), 0, 1)

    # القماش أسمك عند الحاشية والأكمام (حافة مرئية)
    t = np.full(len(bv), thickness)
    t *= 1.0 + (hem_thicken - 1.0) * smoothstep((hem + 0.030 - z) / 0.030)
    # انسدال: القماش بيبعد أكتر عن مناطق انحناء الجسم بدل ما يلتصق بيها.
    # من غير ده القطعة بتتقري «طلاء على الجسم» مش «هدوم».
    if drape > 0:
        chest = smoothstep((z - (rig.z_waist + 0.020)) / 0.030) * smoothstep(((rig.z_shoulder - 0.020) - z) / 0.040)
        t = t * (1.0 + 0.85 * drape * chest)
    return region_shell(bv, rig.bf, bn, w, t, smooth=6, smooth_factor=0.42,
                        min_gap=max(thickness * 0.80, 0.0050))


# ============================================================
# القطع السفلية الملتصقة (بنطلون / شورت / ليجن)
# ============================================================

def build_pants(rig: BodyRig, *, hem: float, waist: float | None = None,
                thickness: float = 0.0135, flare: float = 0.0) -> tuple[np.ndarray, list]:
    """بنطلون/شورت: من الخصر نزولًا على الساقين حتى الحاشية."""
    bv, bn = rig.bv, rig.bn
    z = bv[:, 2]
    # الحزام أعلى من الخصر التشريحي عشان يتداخل مع حاشية القطعة العلوية
    waist_z = rig.z_waist + 0.018 if waist is None else waist

    body = smoothstep((waist_z - z) / 0.022)
    below = smoothstep((z - hem) / 0.024)
    w = np.clip(body * below, 0, 1)

    t = np.full(len(bv), thickness)
    t *= 1.0 + 0.9 * smoothstep((hem + 0.028 - z) / 0.028)     # حاشية أسمك
    t *= 1.0 + 0.7 * smoothstep((z - (waist_z - 0.030)) / 0.030)  # حزام
    # سعة عند الفخذ: البنطلون الملتصق تمامًا بيتقري «ليجن» مهما كان لونه
    thigh = smoothstep((z - (rig.z_knee + 0.030)) / 0.060) * smoothstep((rig.z_hip - z) / 0.040)
    t = t * (1.0 + 0.55 * thigh)
    if flare > 0:
        drop = np.clip((waist_z - z) / max(waist_z - hem, 1e-6), 0, 1)
        t = t + flare * drop ** 1.6
    return region_shell(bv, rig.bf, bn, w, t, smooth=6, smooth_factor=0.45,
                        min_gap=max(thickness * 0.80, 0.0055))


# ============================================================
# الجيبات والفساتين المنسدلة (سطح مُدار)
# ============================================================

def _loft_shell(sections_out: list[np.ndarray], sections_in: list[np.ndarray]):
    """يبني جسمًا مصمتًا من مقاطع خارجية وداخلية مغلقة."""
    n = len(sections_out[0])
    rows = len(sections_out)
    outer = np.concatenate(sections_out, axis=0)
    inner = np.concatenate(sections_in, axis=0)
    verts = np.concatenate([outer, inner], axis=0)
    off = len(outer)
    idx = lambda r, c: r * n + (c % n)
    faces = []
    for r in range(rows - 1):
        for c in range(n):
            faces.append((idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)))
            faces.append((off + idx(r, c + 1), off + idx(r, c),
                          off + idx(r + 1, c), off + idx(r + 1, c + 1)))
    # حلقة الحاشية السفلى
    for c in range(n):
        a, b = idx(rows - 1, c), idx(rows - 1, c + 1)
        faces.append((a, b, off + b, off + a))
    # حلقة الخصر العليا
    for c in range(n):
        a, b = idx(0, c), idx(0, c + 1)
        faces.append((off + a, off + b, b, a))
    return verts, faces


def build_skirt(rig: BodyRig, *, hem: float, waist: float | None = None,
                flare: float = 1.9, pleats: int = 0, thickness: float = 0.006,
                n_seg: int = 72, n_rows: int = 26) -> tuple[np.ndarray, list]:
    """
    جيبة منسدلة.

    مبنية كسطح مُدار لأنها بتبتعد عن الجسم — لو عملناها كإزاحة من الجلد
    هتفضل ملتصقة بالساقين وتبان ليجن مش جيبة.
    """
    waist_z = rig.z_waist - 0.010 if waist is None else waist
    bv = rig.bv

    # نصف قطر الجسم عند الخصر (نقطة البداية).
    # **لازم نستثني الذراعين**: الوقفة A-pose بتخلي الذراع على ارتفاع
    # الخصر، فقياس المقطع بيرجّع عرض الذراعين لا الجذع — والجيبة بتطلع
    # لوحًا بعرض المتر.
    not_arm = rig.is_arm() < 0.35
    m = (np.abs(bv[:, 2] - waist_z) < 0.014) & not_arm
    if m.sum() < 8:
        m = (np.abs(bv[:, 2] - waist_z) < 0.035) & not_arm
    ref = bv[m]
    # مئين بدل القيمة القصوى: الأصابع بتمتد بعد نهاية محور الذراع فقناع
    # الذراع مش بيمسكها، وقيمة max واحدة شاذة كافية تخلي الجيبة بعرض متر.
    rx0 = float(np.percentile(np.abs(ref[:, 0]), 90)) + 0.005
    y_lo = float(np.percentile(ref[:, 1], 6))
    y_hi = float(np.percentile(ref[:, 1], 94))
    ry0 = (y_hi - y_lo) / 2 + 0.005
    cy = (y_hi + y_lo) / 2

    zs = np.linspace(waist_z, hem, n_rows)
    t = np.linspace(0.0, 1.0, n_rows)
    # الاتساع يزيد مع النزول بمنحنى مقعّر (سقوط قماش طبيعي)
    grow = 1.0 + (flare - 1.0) * t ** 1.35
    theta = np.arange(n_seg) / n_seg * TAU

    def sections(extra: float):
        out = []
        for i, z in enumerate(zs):
            rx = rx0 * grow[i] + extra
            ry = ry0 * grow[i] + extra
            if pleats > 0:
                rip = 1.0 + 0.055 * t[i] * np.cos(theta * pleats)
                rx_v, ry_v = rx * rip, ry * rip
            else:
                rx_v = np.full(n_seg, rx)
                ry_v = np.full(n_seg, ry)
            x = np.cos(theta) * rx_v
            y = np.sin(theta) * ry_v + cy
            out.append(np.stack([x, y, np.full(n_seg, z)], axis=1))
        return out

    return _loft_shell(sections(thickness), sections(0.0))


def build_dress(rig: BodyRig, *, hem: float, sleeve: str = 'cap', neck: str = 'scoop',
                flare: float = 1.7, pleats: int = 0, waist_drop: float = 0.0):
    """
    فستان = قطعة علوية طويلة + جيبة منسدلة من الخصر.
    يُرجَع كقطعتين لتفادي التداخل عند خط الخصر.
    """
    waist_z = rig.z_waist - 0.005 + waist_drop
    top = build_top(rig, hem=waist_z - 0.020, sleeve=sleeve, neck=neck, hem_thicken=1.0)
    skirt = build_skirt(rig, hem=hem, waist=waist_z, flare=flare, pleats=pleats)
    return top, skirt


# ============================================================
# الأحذية
# ============================================================

def build_shoes(rig: BodyRig, *, height: float = 0.0, thickness: float = 0.016,
                sole: float = 0.014) -> tuple[np.ndarray, list]:
    """
    حذاء: منطقة القدم مُزاحة، مع نعل مسطح أسفلها.
    `height` = ارتفاع الرقبة فوق الكاحل (0 = حذاء منخفض، 0.08 = بوت).
    """
    bv, bn = rig.bv, rig.bn
    z = bv[:, 2]
    top_z = rig.z_ankle + 0.012 + height
    w = smoothstep((top_z - z) / 0.020)

    t = np.full(len(bv), thickness)
    t += sole * smoothstep((rig.z_ankle - 0.030 - z) / 0.025)
    # تمويه الأصابع: الحذاء سطح أملس، والأصابع البارزة بتفضحه
    toe = smoothstep((z - (rig.z_ankle - 0.055)) / 0.030) * smoothstep((0.030 - np.abs(bv[:, 1] - rig.J['l-foot-2'][1])) / 0.030)
    t += 0.010 * toe
    return region_shell(bv, rig.bf, bn, w, t, smooth=5, smooth_factor=0.40,
                        min_gap=max(thickness * 0.90, 0.0080))


# ============================================================
# كتالوج القطع — إضافة عنصر جديد = صف واحد
# ============================================================

CATALOG: dict[str, dict] = {
    # --- علوي ---
    'tee':            dict(kind='top', hem=0.590, sleeve='short', neck='crew'),
    'tee_crop':       dict(kind='top', hem=0.648, sleeve='short', neck='crew'),
    'tank':           dict(kind='top', hem=0.592, sleeve='none',  neck='scoop'),
    'blouse':         dict(kind='top', hem=0.575, sleeve='elbow', neck='v'),
    'sweater':        dict(kind='top', hem=0.568, sleeve='long',  neck='crew', thickness=0.0125),
    'hoodie':         dict(kind='top', hem=0.585, sleeve='long',  neck='high', thickness=0.0140),
    'cardigan':       dict(kind='top', hem=0.556, sleeve='long',  neck='v',    thickness=0.0110),
    'jacket':         dict(kind='top', hem=0.580, sleeve='long',  neck='high', thickness=0.0150),
    # --- سفلي ملتصق ---
    'jeans':          dict(kind='pants', hem=0.062),
    'joggers':        dict(kind='pants', hem=0.080, thickness=0.0105),
    'wide_pants':     dict(kind='pants', hem=0.055, flare=0.030),
    'shorts':         dict(kind='pants', hem=0.400),
    'shorts_long':    dict(kind='pants', hem=0.330),
    # --- جيبات ---
    'skirt_a':        dict(kind='skirt', hem=0.395, flare=1.95),
    'skirt_mini':     dict(kind='skirt', hem=0.440, flare=1.55),
    'skirt_pleated':  dict(kind='skirt', hem=0.400, flare=1.85, pleats=22),
    'skirt_midi':     dict(kind='skirt', hem=0.270, flare=2.15),
    # --- فساتين ---
    'sundress':       dict(kind='dress', hem=0.375, sleeve='none', neck='scoop', flare=1.85),
    'day_dress':      dict(kind='dress', hem=0.360, sleeve='cap',  neck='crew',  flare=1.70),
    'party_dress':    dict(kind='dress', hem=0.330, sleeve='none', neck='scoop', flare=2.20, pleats=26),
    'hoodie_dress':   dict(kind='dress', hem=0.430, sleeve='long', neck='high',  flare=1.35),
    'gown':           dict(kind='dress', hem=0.075, sleeve='none', neck='scoop', flare=2.05),
    # --- أحذية ---
    'sneakers':       dict(kind='shoes', height=0.010, sole=0.014),
    'flats':          dict(kind='shoes', height=0.000, sole=0.006),
    'boots':          dict(kind='shoes', height=0.075, sole=0.014),
    'boots_tall':     dict(kind='shoes', height=0.150, sole=0.012),
}


def build(rig: BodyRig, name: str):
    """
    يبني قطعة من الكتالوج.
    يرجّع قائمة (verts, faces) — الفساتين ترجّع قطعتين.
    """
    cfg = dict(CATALOG[name])
    kind = cfg.pop('kind')
    if kind == 'top':
        return [build_top(rig, **cfg)]
    if kind == 'pants':
        return [build_pants(rig, **cfg)]
    if kind == 'skirt':
        return [build_skirt(rig, **cfg)]
    if kind == 'dress':
        return list(build_dress(rig, **cfg))
    if kind == 'shoes':
        return [build_shoes(rig, **cfg)]
    raise ValueError(f'نوع غير معروف: {kind}')
