"""
شخصية ليڤي — مبنية على شبكة MakeHuman الأساسية (CC0).

لماذا شبكة جاهزة بدل النمذجة البرمجية الكاملة:
التشريح البشري (الأنف، الجفن، الأذن، الترقوة، رسغ اليد) نتيجة عقود من
عمل نمذجة يدوي، ومحاولة توليده بالمعادلات بتنتج شكلًا «قريب» بس مش مقنع.
الشبكة دي مُطلقة CC0 صراحةً (استخدام تجاري حر بلا نسب)، فبنكسب التشريح
الاحترافي، وبنحتفظ بكل طبقة التوليد البرمجي فوقه: الأسلوب، اللون،
الشعر، والملابس — وهي اللي بتخلي إضافة قطعة جديدة كودًا مش نمذجة.

قيد المنتج: الشبكة الأساسية محايدة وعارية. خط الإنتاج ده **لا يُصدِّر أبدًا**
شخصية بدون ملابس، والنسب مُعدَّلة لتقرأ كمراهقة بأسلوب رسومي غير واقعي
وغير مُجسَّد — انظر PRODUCT_BLUEPRINT §9.
"""
from __future__ import annotations
import numpy as np
from pathlib import Path
from objload import ObjMesh, load_obj

ASSETS = Path(__file__).parent / 'assets'


# ============================================================
# التحميل والتطبيع
# ============================================================

class Base:
    """الشبكة الأساسية بعد التحويل لفضاء اللعبة."""

    def __init__(self, obj_path: str | Path | None = None):
        self.mesh: ObjMesh = load_obj(obj_path or (ASSETS / 'base.obj'))
        # MakeHuman: X يمين · Y أعلى · Z أمام
        # فضاء اللعبة:  X يمين · Y عمق (الوجه نحو -Y) · Z أعلى
        v = self.mesh.verts
        v = np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)
        # القدمان عند z=0 والطول = 1.0
        v = v - np.array([0.0, 0.0, v[:, 2].min()])
        self.scale = 1.0 / v[:, 2].max()
        v = v * self.scale
        self.verts = v
        self.joints = self._joint_centroids()

    def _joint_centroids(self) -> dict[str, np.ndarray]:
        out: dict[str, np.ndarray] = {}
        for name, faces in self.mesh.groups.items():
            if not name.startswith('joint-'):
                continue
            idx = sorted({i for f in faces for i in f})
            out[name[6:]] = self.verts[idx].mean(0)
        return out

    def j(self, name: str) -> np.ndarray:
        return self.joints[name]

    def group(self, *names: str) -> tuple[np.ndarray, list[tuple[int, ...]]]:
        """يستخرج مجموعات بالرؤوس المُحوَّلة."""
        faces = self.mesh.group_faces(*names)
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        return self.verts[used], [tuple(remap[i] for i in f) for f in faces]

    def group_indices(self, *names: str) -> np.ndarray:
        faces = self.mesh.group_faces(*names)
        return np.array(sorted({i for f in faces for i in f}), dtype=int)


# ============================================================
# التنميط (Stylization)
# ============================================================

def _band(z: np.ndarray, lo: float, hi: float, softness: float = 0.12) -> np.ndarray:
    """قناع رأسي ناعم بين ارتفاعين."""
    a = np.clip((z - lo) / max(softness, 1e-6), 0, 1)
    b = np.clip((hi - z) / max(softness, 1e-6), 0, 1)
    m = np.minimum(a, b)
    return m * m * (3 - 2 * m)


def stylize(base: Base, verts: np.ndarray, *,
            head_scale: float = 1.055,
            eye_scale: float = 1.16,
            leg_lengthen: float = 1.035,
            limb_slim: float = 0.94,
            waist: float = 0.955,
            jaw_soften: float = 0.90,
            chest_neutral: float = 0.78) -> np.ndarray:
    """
    يحوّل الشبكة التشريحية المحايدة لشخصية أسلوبية.

    كل معامل بيعالج فرق محدد بين «إنسان واقعي» و«شخصية لعبة»:
    الرأس أكبر قليلًا (يقرأ أصغر سنًا وأكثر جاذبية)، العين أكبر،
    الأطراف أنحف، والصدر محايد ومناسب للعمر.
    """
    v = verts.copy()
    z = v[:, 2]

    head_c = base.j('head')
    neck_c = base.j('neck')
    eye_l, eye_r = base.j('l-eye'), base.j('r-eye')
    eye_mid = (eye_l + eye_r) / 2
    pelvis = base.j('pelvis')

    # ---- 1. تكبير الرأس حول قاعدة الرقبة ----
    hm = np.clip((z - neck_c[2]) / max(head_c[2] - neck_c[2], 1e-6), 0, 1)
    hm = hm * hm * (3 - 2 * hm)
    pivot = np.array([0.0, neck_c[1], neck_c[2]])
    v = v + (v - pivot) * ((head_scale - 1.0) * hm)[:, None]

    # ---- 2. تكبير منطقة العين ----
    for eye in (eye_l, eye_r):
        d = np.linalg.norm(v - eye, axis=1)
        w = np.clip(1.0 - d / 0.052, 0, 1)
        w = w * w * (3 - 2 * w)
        v = v + (v - eye) * ((eye_scale - 1.0) * w)[:, None]

    # ---- 3. تليين الفك ----
    jaw = base.j('jaw')
    d = np.linalg.norm(v - jaw, axis=1)
    w = np.clip(1.0 - d / 0.075, 0, 1) ** 1.4
    v[:, 0] *= (1.0 - (1.0 - jaw_soften) * w * 0.55)
    v[:, 2] += w * 0.006

    # ---- 4. صدر محايد مناسب للعمر ----
    chest_z = (base.j('spine-1')[2] + base.j('l-clavicle')[2]) / 2
    cm = _band(z, chest_z - 0.055, chest_z + 0.035, 0.045)
    front = np.clip(-v[:, 1] / 0.10, 0, 1)
    v[:, 1] *= (1.0 - (1.0 - chest_neutral) * cm * front)

    # ---- 5. تنحيف الخصر ----
    waist_z = base.j('spine-3')[2]
    wm = _band(z, waist_z - 0.045, waist_z + 0.055, 0.05)
    v[:, 0] *= (1.0 - (1.0 - waist) * wm)
    v[:, 1] *= (1.0 - (1.0 - waist) * wm * 0.7)

    # ---- 6. تنحيف الأطراف ----
    # الذراعان: كل ما ابتعدنا عن المحور المركزي
    arm = np.clip((np.abs(v[:, 0]) - 0.085) / 0.10, 0, 1)
    arm *= _band(z, base.j('l-hand')[2] - 0.05, base.j('l-shoulder')[2] + 0.03, 0.06)
    axis = np.stack([np.sign(v[:, 0]) * 0.13, np.zeros(len(v)), v[:, 2]], axis=1)
    v = v + (axis - v) * ((1.0 - limb_slim) * arm)[:, None] * 0.6
    # الساقان
    leg = _band(z, 0.0, pelvis[2] - 0.02, 0.06)
    axis_l = np.stack([np.sign(v[:, 0]) * 0.055, np.zeros(len(v)), v[:, 2]], axis=1)
    v = v + (axis_l - v) * ((1.0 - limb_slim) * leg)[:, None] * 0.5

    # ---- 7. إطالة الساقين قليلًا (نسب رسم الأزياء) ----
    hip_z = pelvis[2]
    below = v[:, 2] < hip_z
    v[below, 2] = hip_z - (hip_z - v[below, 2]) * leg_lengthen
    v[:, 2] -= v[:, 2].min()
    v /= v[:, 2].max()

    return v


# ============================================================
# ألوان الرؤوس (بديل خريطة النسيج — دقيق ومستقل عن تخطيط UV)
# ============================================================

def _hex(c: str) -> np.ndarray:
    c = c.lstrip('#')
    return np.array([int(c[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def face_vertex_colors(rig, verts: np.ndarray, skin_hex: str, lip_hex: str,
                       *, blush: float = 1.0, brow_hex: str = '#2A1810',
                       lash_line: float = 1.0, freckles: float = 0.0,
                       seed: int = 7) -> np.ndarray:
    """
    يحسب لون كل رأس من موقعه التشريحي.

    **كل الأنصاف أقطار بوحدة المسافة بين العينين (`rig.inter`).**
    ده مش تفصيل: القيم المطلقة بتتغير مع أي تعديل في نسب الرأس، ولو
    نصف القطر أكبر من الوجه بيتلطّخ اللون على الرأس كله ويختفي الأثر.

    استخدام ألوان الرؤوس بدل خريطة UV بيخلي النظام مستقلًا تمامًا عن
    تخطيط UV للشبكة الأساسية.
    """
    u = rig.inter
    skin = _hex(skin_hex)
    lip = _hex(lip_hex)
    brow = _hex(brow_hex)
    warm = np.clip(skin * [1.06, 0.94, 0.90], 0, 1)
    shade = np.clip(skin * 0.82, 0, 1)
    deep = np.clip(skin * 0.68, 0, 1)

    col = np.repeat(skin[None, :], len(verts), axis=0)
    # قناع الواجهة الأمامية — يمنع تسرّب اللون لمؤخرة الرأس
    front = np.clip((rig.eye_mid[1] * 0.35 - verts[:, 1]) / (u * 1.5), 0, 1)

    def soft(center, radii, power=1.0):
        d = np.linalg.norm((verts - np.asarray(center)) / (np.asarray(radii) * u), axis=1)
        w = np.clip(1.0 - d, 0, 1)
        return (w * w * (3 - 2 * w)) ** power

    def blend(color, w):
        nonlocal col
        w = np.clip(w, 0, 1)[:, None]
        col = col * (1 - w) + color[None, :] * w

    # ---- تظليل المحجر: بيدي العين عمقًا ----
    for side in (1, -1):
        e = rig.eye_l if side > 0 else rig.eye_r
        lid = e + np.array([0, -u * 0.30, u * 0.20])
        blend(shade, soft(lid, [0.52, 0.34, 0.30]) * 0.34 * front)
        inner = e + np.array([-side * u * 0.28, -u * 0.20, 0])
        blend(deep, soft(inner, [0.20, 0.22, 0.20]) * 0.20 * front)
        under = e + np.array([0, -u * 0.28, -u * 0.30])
        blend(shade, soft(under, [0.46, 0.30, 0.18]) * 0.16 * front)

    # ---- خط الرموش العلوي: أقوى عنصر في «حياة» العين ----
    if lash_line > 0:
        for side in (1, -1):
            e = rig.eye_l if side > 0 else rig.eye_r
            line = e + np.array([side * u * 0.05, -u * 0.34, u * 0.135])
            blend(np.clip(brow * 0.85, 0, 1),
                  soft(line, [0.44, 0.24, 0.048], 0.85) * 0.62 * lash_line * front)

    # ---- الحاجب ----
    for side in (1, -1):
        b = rig.brow(side)
        w = soft(b, [0.62, 0.26, 0.115], 0.9) * front
        # ترقيق الطرف الخارجي
        taper = 1.0 - 0.45 * np.clip((np.abs(verts[:, 0]) - abs(b[0])) / (u * 0.5), 0, 1)
        blend(brow, w * 0.90 * taper)

    # ---- احمرار الخدين ----
    if blush > 0:
        for side in (1, -1):
            c = rig.cheek(side) + np.array([0, 0, u * 0.10])
            blend(np.clip(skin * [1.13, 0.84, 0.84], 0, 1),
                  soft(c, [0.62, 0.44, 0.52], 1.25) * 0.30 * blush * front)

    # ---- الشفاه ----
    lc = rig.lip_center
    upper = soft(lc + np.array([0, u * 0.06, u * 0.105]), [0.64, 0.46, 0.155], 0.85)
    lower = soft(lc + np.array([0, u * 0.06, -u * 0.115]), [0.60, 0.46, 0.170], 0.85)
    lips = np.clip(np.maximum(upper, lower), 0, 1) * front
    blend(lip, lips * 0.95)
    blend(np.clip(lip * 1.24, 0, 1), lower * front * 0.30)     # ضوء على الشفة السفلى
    blend(np.clip(lip * 0.62, 0, 1), upper * front * 0.36)     # الشفة العليا في الظل
    blend(np.clip(lip * 0.34, 0, 1),
          soft(lc + np.array([0, u * 0.05, 0]), [0.62, 0.40, 0.045], 0.8) * front * 0.85)   # خط الفم

    # ---- دفء الأنف وظل تحت الفك ----
    nose = rig.eye_mid + np.array([0, -u * 0.50, -u * 0.28])
    blend(warm, soft(nose, [0.34, 0.34, 0.34]) * 0.22 * front)
    blend(shade, soft(rig.J['jaw'] + np.array([0, u * 0.20, -u * 0.20]),
                      [1.5, 1.1, 0.55]) * 0.18)

    # ---- نمش اختياري ----
    if freckles > 0:
        rng = np.random.default_rng(seed)
        acc = np.zeros(len(verts))
        for _ in range(90):
            cx = rng.uniform(-u * 1.1, u * 1.1)
            cz = rig.lip_center[2] + rng.uniform(u * 0.5, u * 1.5)
            c = np.array([cx, rig.eye_mid[1] - u * 0.45, cz])
            acc = np.maximum(acc, soft(c, [0.10, 0.30, 0.10]))
        blend(np.clip(skin * [0.80, 0.66, 0.58], 0, 1), acc * 0.40 * freckles * front)

    return np.clip(col, 0, 1)


def eye_radius(base: Base) -> float:
    """يستنتج نصف قطر كرة العين من هندسة الجفون."""
    up = base.j('l-upperlid')
    lo = base.j('l-lowerlid')
    return float(max(np.linalg.norm(up - lo) * 0.86, 0.012))
