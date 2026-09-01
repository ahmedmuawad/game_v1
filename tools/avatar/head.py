"""
نحت رأس بأسلوب «واقعي مُبسَّط» (stylized-realistic).

المرجع: رسوم متحركة معاصرة عالية الجودة — ملامح مقروءة وواقعية النسب،
بلا محاكاة فوتوغرافية (وادي الغرابة) ولا تبسيط طفولي.

الإحداثيات: الوجه نحو -Y · Z لأعلى · مركز الرأس (0,0,0)
ارتفاع الرأس 1.0 (الذقن -0.50 → قمة الجمجمة +0.50)

كل النحت يتم بـ push_face: الاستهداف بموقع (x,z) على واجهة الوجه،
فمش محتاجين نحسب عمق السطح يدويًا.
"""
from __future__ import annotations
import numpy as np
from meshlib import UVSphere, revolve

# ---- خطوط الوجه المرجعية (نسب تشريحية) ----
BROW_Z = 0.105
EYE_Z = 0.005
NOSE_TIP_Z = -0.175
NOSE_BASE_Z = -0.215
MOUTH_Z = -0.305
CHIN_Z = -0.455
EYE_X = 0.155       # نصف المسافة بين مركزي العينين
EYE_R = 0.094       # نصف قطر كرة العين


def build_head(
    *,
    jaw_width: float = 1.0,
    cheek_fullness: float = 1.0,
    nose_size: float = 1.0,
    lip_fullness: float = 1.0,
    eye_size: float = 1.0,
) -> UVSphere:
    """يبني شبكة الرأس ويرجّع كائن UVSphere (عشان نقدر نستعلم عن السطح)."""
    s = UVSphere(nu=128, nv=100)

    # ---------- 1. كتلة الجمجمة ----------
    s.verts[:, 2] *= 0.489      # نصف الارتفاع (يُضبط أولًا لأن المقطع يعتمد عليه)
    # مقطع فوق-بيضاوي: جمجمة مستديرة ممتلئة من فوق بدل البيضة المدببة
    s.cranium_profile(half_height=0.489, exponent_top=2.55, exponent_bottom=2.10)
    s.verts[:, 0] *= 0.395      # نصف العرض
    s.verts[:, 1] *= 0.404      # نصف العمق

    # الجمجمة أعرض عند الصدغين
    s.scale_band(z_center=0.16, z_radius=0.28, sx=1.030, sy=1.020)
    # مؤخرة الرأس تمتد للخلف (تشريحيًا الجمجمة مش كرة)
    back = 1.0 - s.front
    s.verts[:, 1] += back ** 2 * 0.052

    # ---------- 2. تضييق الفك وبناء الذقن ----------
    taper = np.clip((EYE_Z - s.verts[:, 2]) / 0.50, 0.0, 1.0) ** 1.60
    s.verts[:, 0] *= (1.0 - taper * (0.255 / jaw_width))
    s.verts[:, 1] *= (1.0 - taper * 0.095)

    # زاوية الفك
    s.mirror_face(0.225, -0.255, 0.155, (1, 0, -0.25), 0.022 * jaw_width, power=1.5)
    # خط الفك المائل نحو الذقن
    s.mirror_face(0.140, -0.385, 0.150, (0.55, -0.55, -0.30), 0.024, power=1.4)
    # الذقن — بروز مستدير صغير
    s.push_face(0.0, CHIN_Z + 0.015, 0.130, (0, -1, 0.15), 0.043, power=1.45)
    # ثنية تحت الشفة السفلى (بتفصل الذقن عن الفم)
    s.push_face(0.0, MOUTH_Z - 0.062, 0.062, (0, 1, 0), 0.017, power=1.2)

    # ---------- 3. الخدود ----------
    # عظمة الخد — أعلى نقطة عرض في الوجه
    s.mirror_face(0.235, -0.045, 0.150, (0.85, -0.55, 0.15), 0.030 * cheek_fullness, power=1.45)
    # امتلاء الخد الشبابي
    s.mirror_face(0.190, -0.175, 0.140, (0.60, -0.72, 0), 0.026 * cheek_fullness, power=1.35)
    # تفريغ خفيف أسفل عظمة الخد — بيحدّد الشكل
    s.mirror_face(0.215, -0.115, 0.085, (-0.7, 0.7, 0), 0.010, power=1.3)

    # ---------- 4. الجبهة والصدغ ----------
    s.mirror_face(0.255, 0.215, 0.130, (-0.9, 0.35, 0), 0.015, power=1.4)
    s.push_face(0.0, 0.300, 0.235, (0, 1, 0), 0.020, power=1.25)     # ميل الجبهة للخلف
    s.push_face(0.0, BROW_Z, 0.190, (0, -1, 0), 0.020, power=1.5)    # حافة الحاجب
    s.mirror_face(EYE_X, BROW_Z + 0.008, 0.115, (0, -1, 0.12), 0.014, power=1.4)
    s.push_face(0.0, BROW_Z + 0.045, 0.070, (0, 1, 0), 0.008, power=1.2)  # بين الحاجبين

    # ---------- 5. محاجر العيون ----------
    es = eye_size
    for sx in (1, -1):
        x = sx * EYE_X
        # التجويف الرئيسي — يخلق مكان كرة العين
        s.push_face(x, EYE_Z, 0.115 * es, (0, 1, 0), 0.036, power=1.05, z_scale=0.82)
        # الزاوية الداخلية أعمق (المآق)
        s.push_face(sx * 0.072, EYE_Z - 0.004, 0.058, (0, 1, 0), 0.020, power=1.15)
        # الجفن العلوي — يبرز فوق العين ويلقي ظلًا
        s.push_face(x, EYE_Z + 0.052 * es, 0.088 * es, (0, -1, 0.25), 0.020, power=1.25)
        # طية الجفن
        s.push_face(x, EYE_Z + 0.072 * es, 0.070 * es, (0, 1, 0), 0.008, power=1.2)
        # الجفن السفلي
        s.push_face(x, EYE_Z - 0.050 * es, 0.070 * es, (0, -1, -0.18), 0.014, power=1.25)
        # الهالة تحت العين
        s.push_face(x, EYE_Z - 0.082, 0.062, (0, 1, 0), 0.006, power=1.2)

    # ---------- 6. الأنف ----------
    n = nose_size
    s.push_face(0.0, BROW_Z - 0.030, 0.062, (0, -1, 0), 0.018 * n, power=1.4)   # جذر الأنف
    s.push_face(0.0, EYE_Z - 0.020, 0.052, (0, -1, 0), 0.030 * n, power=1.4)    # الجسر أعلى
    s.push_face(0.0, EYE_Z - 0.095, 0.050, (0, -1, 0), 0.040 * n, power=1.35)   # الجسر أسفل
    s.push_face(0.0, NOSE_TIP_Z, 0.052, (0, -1, 0.06), 0.052 * n, power=1.25)   # الأرنبة
    s.push_face(0.0, NOSE_TIP_Z - 0.022, 0.038, (0, -1, -0.15), 0.030 * n, power=1.2)
    s.mirror_face(0.048, NOSE_TIP_Z - 0.014, 0.036, (0.5, -0.85, 0), 0.024 * n, power=1.25)
    s.push_face(0.0, NOSE_BASE_Z, 0.042, (0, 1, 0), 0.020 * n, power=1.15)      # قاعدة الأنف
    s.mirror_face(0.052, NOSE_BASE_Z + 0.006, 0.026, (0, 1, 0), 0.010 * n, power=1.1)

    # ---------- 7. الشفاه ----------
    lf = lip_fullness
    s.push_face(0.0, MOUTH_Z, 0.120, (0, -1, 0), 0.026, power=1.3)              # كتلة الفم
    s.push_face(0.0, MOUTH_Z + 0.026, 0.046, (0, -1, 0.05), 0.030 * lf, power=1.1)  # الشفة العليا
    s.mirror_face(0.030, MOUTH_Z + 0.030, 0.030, (0, -1, 0), 0.018 * lf, power=1.0)  # قوس كيوبيد
    s.push_face(0.0, MOUTH_Z - 0.036, 0.050, (0, -1, -0.08), 0.040 * lf, power=1.1)  # الشفة السفلى
    s.push_face(0.0, MOUTH_Z - 0.002, 0.020, (0, 1, 0), 0.024, power=0.9)       # خط الفم (أخدود حاد)
    s.mirror_face(0.062, MOUTH_Z - 0.004, 0.028, (0, 1, 0), 0.018, power=1.1)   # زوايا الفم
    s.push_face(0.0, MOUTH_Z + 0.062, 0.032, (0, 1, 0), 0.011, power=1.2)       # أخدود الفلتروم
    s.mirror_face(0.098, MOUTH_Z + 0.028, 0.050, (0, 1, 0), 0.009, power=1.25)  # خطوط الابتسامة

    return s


def head_arrays(s: UVSphere) -> tuple[np.ndarray, list]:
    return s.verts, s.faces()


def eye_center(s: UVSphere, side: int) -> np.ndarray:
    """
    يضع كرة العين بحيث يبرز جزء منها من المحجر بالقدر الصحيح.
    نستعلم عن سطح الوجه الفعلي بدل تخمين العمق.
    """
    x = side * EYE_X
    y_surf = s.surface_y(x, EYE_Z)
    return np.array([x, y_surf + EYE_R * 0.60, EYE_Z])


def build_eyeball(center: np.ndarray) -> tuple[np.ndarray, list]:
    e = UVSphere(nu=44, nv=34)
    e.verts *= EYE_R
    e.verts += center
    return e.verts, e.faces()


def build_iris(center: np.ndarray, iris_r: float = 0.046) -> tuple[np.ndarray, list]:
    """قزحية كقبة على سطح كرة العين — بتدي عمقًا وانعكاس ضوء حقيقيين."""
    n_ring, n_seg = 8, 40
    verts = [center + np.array([0.0, -EYE_R - 0.0015, 0.0])]
    for ring in range(1, n_ring + 1):
        rr = iris_r * ring / n_ring
        depth = np.sqrt(max(EYE_R ** 2 - rr ** 2, 1e-6))
        bulge = 0.0045 * (1.0 - (ring / n_ring) ** 2)
        for i in range(n_seg):
            a = i / n_seg * 2 * np.pi
            verts.append(center + np.array([np.cos(a) * rr, -(depth + bulge), np.sin(a) * rr]))
    verts = np.array(verts)
    faces = [(0, 1 + i, 1 + (i + 1) % n_seg) for i in range(n_seg)]
    for ring in range(n_ring - 1):
        b0, b1 = 1 + ring * n_seg, 1 + (ring + 1) * n_seg
        for i in range(n_seg):
            j = (i + 1) % n_seg
            faces.append((b0 + i, b0 + j, b1 + j, b1 + i))
    return verts, faces


def build_pupil(center: np.ndarray, r: float = 0.020) -> tuple[np.ndarray, list]:
    n_seg = 32
    verts = [center + np.array([0.0, -EYE_R - 0.0075, 0.0])]
    depth = np.sqrt(max(EYE_R ** 2 - r ** 2, 1e-6))
    for i in range(n_seg):
        a = i / n_seg * 2 * np.pi
        verts.append(center + np.array([np.cos(a) * r, -(depth + 0.0055), np.sin(a) * r]))
    return np.array(verts), [(0, 1 + i, 1 + (i + 1) % n_seg) for i in range(n_seg)]


def build_lash(s: UVSphere, side: int) -> tuple[np.ndarray, list]:
    """
    خط رموش علوي كشريط رفيع.
    عنصر أسلوبي حاسم: هو اللي بيحوّل «رأس منحوت» لـ«شخصية».
    """
    x0 = side * EYE_X
    n = 26
    t = np.linspace(-1.0, 1.0, n)
    # قوس الجفن العلوي
    xs = x0 + t * 0.104
    zs = EYE_Z + 0.050 - (t ** 2) * 0.026
    # السُمك يزيد ناحية الزاوية الخارجية
    thick = 0.010 + 0.011 * np.clip(t * side, 0, 1) ** 1.3
    top, bot = [], []
    for i in range(n):
        y = s.surface_y(float(xs[i]), float(zs[i])) - 0.004
        top.append([xs[i], y, zs[i] + thick[i]])
        bot.append([xs[i], y, zs[i] - 0.004])
    verts = np.array(top + bot)
    faces = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    return verts, faces


def build_brow(s: UVSphere, side: int, thickness: float = 1.0) -> tuple[np.ndarray, list]:
    """حاجب كشريط منحني — أهم عنصر في نقل التعبير."""
    x0 = side * EYE_X + side * 0.012
    n = 22
    t = np.linspace(-1.0, 1.0, n)
    xs = x0 + t * 0.092
    # قمة القوس عند ثلثي الطول ناحية الخارج، والطرفان ينزلان بلطف
    u = t * side                       # u=-1 داخلي (ناحية الأنف)، +1 خارجي
    zs = BROW_Z + 0.018 + 0.020 * np.exp(-((u - 0.35) ** 2) / 0.42) - 0.020 * np.clip(u, 0, 1) ** 2.4
    zs -= 0.010 * np.clip(-u, 0, 1) ** 2.0
    th = (0.017 - 0.010 * np.clip(u, 0, 1) ** 1.8) * thickness
    top, bot = [], []
    for i in range(n):
        y = s.surface_y(float(xs[i]), float(zs[i])) - 0.006
        top.append([xs[i], y, zs[i] + th[i]])
        bot.append([xs[i], y, zs[i] - th[i] * 0.55])
    verts = np.array(top + bot)
    faces = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    return verts, faces


def build_neck() -> tuple[np.ndarray, list]:
    """رقبة ممدودة — علامة أسلوب رسم الأزياء."""
    profile = np.array([
        [0.112, -0.40],
        [0.110, -0.50],
        [0.113, -0.62],
        [0.124, -0.73],
        [0.152, -0.82],
        [0.215, -0.89],
        [0.300, -0.94],
        [0.360, -0.99],
    ])
    v, f = revolve(profile, nu=52, close_bottom=True)
    v[:, 1] -= np.clip((-0.40 - v[:, 2]) * 0.09, 0, 1) * 0.26
    return v, f


def build_ear(side: int) -> tuple[np.ndarray, list]:
    e = UVSphere(nu=30, nv=24)
    e.verts[:, 0] *= 0.020
    e.verts[:, 1] *= 0.050
    e.verts[:, 2] *= 0.076
    e.push((0.0, -0.028, 0.026), 0.048, (0, -1, 0), 0.012, power=1.2)
    e.push((0.0, 0.0, -0.042), 0.032, (0, 0, -1), 0.008)
    e.verts += np.array([side * 0.298, 0.016, EYE_Z - 0.052])
    return e.verts, e.faces()


def build_eyelid(center: np.ndarray, upper: bool = True,
                 lid_v: float = 0.34, open_amount: float = 1.0) -> tuple[np.ndarray, list]:
    """
    جفن كقشرة مزدوجة فوق كرة العين.

    من غير الجفن، العين بتبان كورة كاملة مركّبة في الوجه — وده أوضح علامة
    على «شخصية هاوية». الجفن العلوي لازم يغطي أعلى القزحية.

    القشرة مزدوجة (طبقة خارجية وداخلية) عشان يبقى للجفن حافة سميكة مرئية،
    وهي اللي بتلقي الظل الرقيق على العين.
    """
    n_u, n_v = 34, 9
    sign = 1.0 if upper else -1.0
    v_edge = lid_v * open_amount if upper else lid_v * 0.78
    v_far = 1.30 if upper else 1.05
    us = np.linspace(-1.16, 1.16, n_u)
    vs = np.linspace(v_edge, v_far, n_v) * sign

    def shell(radius_offset: float) -> np.ndarray:
        r = EYE_R + radius_offset
        pts = []
        for v in vs:
            for u in us:
                # قوس الحافة: الجفن مش دائرة مثالية، بيتقوّس لأسفل عند الأطراف
                vv = v - sign * (u ** 2) * 0.095 * (1.0 if upper else 0.55)
                pts.append(center + r * np.array([
                    np.sin(u) * np.cos(vv),
                    -np.cos(u) * np.cos(vv),
                    np.sin(vv),
                ]))
        return np.array(pts)

    outer = shell(0.0105)
    inner = shell(0.0015)
    verts = np.concatenate([outer, inner], axis=0)
    off = len(outer)
    faces = []
    idx = lambda r, c: r * n_u + c
    for r in range(n_v - 1):
        for c in range(n_u - 1):
            faces.append((idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)))
            faces.append((off + idx(r, c + 1), off + idx(r, c),
                          off + idx(r + 1, c), off + idx(r + 1, c + 1)))
    # حافة الجفن: تربط القشرتين وتخلق السُمك المرئي
    for c in range(n_u - 1):
        faces.append((idx(0, c), off + idx(0, c), off + idx(0, c + 1), idx(0, c + 1)))
    return verts, faces
