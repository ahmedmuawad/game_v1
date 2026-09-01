"""
شعر بتقنية «بطاقات الشعر» (hair cards).

ليه القشرات فشلت: قشرة واحدة حول الرأس بتنتج خوذة، ومهما ضبطناها
بتفضل كتلة صمّاء بلا اتجاه. الشعر الحقيقي عبارة عن خصلات ليها **تدفّق** —
والعين بتقرا التدفّق ده قبل أي حاجة تانية.

الطريقة هنا: عشرات الشرائط (ribbons) كل واحد بيتبع مسارًا يبدأ من فروة
الرأس، يلتف على الجمجمة، ثم ينسدل. الشرائط بتتراكب فتدي عمقًا وحجمًا،
وكل شريط ليه عرض وتموّج وطول مختلف — وده اللي بيكسر الإحساس الصناعي.

كل الأبعاد بوحدة المسافة بين العينين (u) فالنظام مستقل عن المقياس.
"""
from __future__ import annotations
import numpy as np

TAU = np.pi * 2


class HeadShape:
    """تقريب إهليلجي للجمجمة — الأساس لمسارات الخصل."""

    def __init__(self, scalp_verts: np.ndarray, rig):
        u = rig.inter
        self.u = u
        head = scalp_verts[scalp_verts[:, 2] > rig.eye_mid[2] - u * 1.6]
        self.center = np.array([
            0.0,
            float((head[:, 1].min() + head[:, 1].max()) / 2),
            float(rig.eye_mid[2] + u * 0.55),
        ])
        self.rx = float(np.abs(head[:, 0]).max())
        self.ry = float(max(head[:, 1].max() - self.center[1], self.center[1] - head[:, 1].min()))
        self.rz = float(head[:, 2].max() - self.center[2])
        self.crown = float(head[:, 2].max())
        self.eye_z = float(rig.eye_mid[2])
        self.face_y = float(rig.eye_mid[1])

    def point(self, theta: float | np.ndarray, phi: float | np.ndarray,
              swell: float = 0.0) -> np.ndarray:
        """
        نقطة على سطح الجمجمة (أو خارجها بمقدار swell).
        theta: زاوية حول المحور الرأسي (−π/2 = الوجه، +π/2 = الخلف)
        phi:   من القمة (0) نزولًا
        """
        sp, cp = np.sin(phi), np.cos(phi)
        return np.stack([
            (self.rx + swell) * sp * np.cos(theta),
            (self.ry + swell) * sp * np.sin(theta) + self.center[1],
            (self.rz + swell) * cp + self.center[2],
        ], axis=-1)


def _smooth_noise(n: int, octaves: int, rng) -> np.ndarray:
    """ضوضاء ناعمة على امتداد الخصلة — تكسر الانتظام الصناعي."""
    t = np.linspace(0, 1, n)
    out = np.zeros(n)
    amp = 1.0
    for k in range(octaves):
        freq = 1.5 * (2 ** k)
        out += amp * np.sin(t * freq * TAU + rng.uniform(0, TAU))
        amp *= 0.55
    return out / max(np.abs(out).max(), 1e-9)


def strand_path(head: HeadShape, theta: float, phi0: float, *,
                drop: float, flare: float, wave: float, curl: float,
                n_pts: int, rng, swell: float) -> np.ndarray:
    """
    مسار خصلة واحدة: يبدأ عند (theta, phi0) على الفروة، يلتف على
    الجمجمة حتى نهايتها، ثم ينسدل مع تموّج وميل خفيف للداخل.
    """
    u = head.u
    # الجزء الملامس للجمجمة
    phi_end = np.pi * 0.62
    n_head = max(int(n_pts * 0.42), 6)
    phis = np.linspace(phi0, phi_end, n_head)
    on_head = head.point(theta, phis, swell=swell)

    # الجزء المنسدل
    n_fall = n_pts - n_head
    start = on_head[-1]
    tang = on_head[-1] - on_head[-2]
    tang = tang / max(np.linalg.norm(tang), 1e-9)
    t = np.linspace(0, 1, n_fall + 1)[1:]
    fall_len = drop * u

    # منحنى السقوط: يكمل اتجاه الجمجمة ثم يستقيم رأسيًا
    blend = np.clip(t * 2.0, 0, 1) ** 0.8
    dirs = (tang[None, :] * (1 - blend)[:, None]
            + np.array([0.0, 0.0, -1.0])[None, :] * blend[:, None])
    dirs /= np.maximum(np.linalg.norm(dirs, axis=1, keepdims=True), 1e-9)
    fall = start[None, :] + np.cumsum(dirs * (fall_len / n_fall), axis=0)

    # انفتاح للخارج ثم تجمّع عند الأطراف
    radial = np.array([np.cos(theta), np.sin(theta), 0.0])
    spread = np.sin(np.clip(t, 0, 1) * np.pi * 0.85) * (flare - 1.0) * u * 2.2
    taper_in = -np.clip((t - 0.72) / 0.28, 0, 1) ** 1.5 * curl * u * 1.6
    fall += radial[None, :] * (spread + taper_in)[:, None]

    pts = np.concatenate([on_head, fall], axis=0)

    # تموّج على امتداد الخصلة
    if wave > 0:
        n = len(pts)
        w1 = _smooth_noise(n, 3, rng)
        w2 = _smooth_noise(n, 4, rng)
        ramp = np.clip((np.arange(n) - n_head * 0.6) / max(n - n_head * 0.6, 1), 0, 1) ** 0.9
        side = np.array([-np.sin(theta), np.cos(theta), 0.0])
        pts += side[None, :] * (w1 * wave * u * 0.42 * ramp)[:, None]
        pts += radial[None, :] * (w2 * wave * u * 0.30 * ramp)[:, None]

    return pts


def ribbon(path: np.ndarray, width0: float, width1: float, thickness: float,
           theta: float) -> tuple[np.ndarray, list]:
    """يحوّل مسارًا إلى شريط مصمت بعرض متناقص."""
    n = len(path)
    t = np.linspace(0, 1, n)
    w = width0 + (width1 - width0) * t ** 1.25
    side = np.array([-np.sin(theta), np.cos(theta), 0.0])
    up = np.array([np.cos(theta), np.sin(theta), 0.0])   # الاتجاه الخارجي

    a = path + side[None, :] * w[:, None]
    b = path - side[None, :] * w[:, None]
    outer = np.concatenate([a, b], axis=0) + up[None, :] * thickness
    inner = np.concatenate([a, b], axis=0) - up[None, :] * thickness
    verts = np.concatenate([outer, inner], axis=0)

    faces = []
    o = 0
    io = 2 * n
    for i in range(n - 1):
        faces.append((o + i, o + i + 1, o + n + i + 1, o + n + i))
        faces.append((io + n + i, io + n + i + 1, io + i + 1, io + i))
    # الحواف الجانبية
    for i in range(n - 1):
        faces.append((o + i, io + i, io + i + 1, o + i + 1))
        faces.append((o + n + i + 1, io + n + i + 1, io + n + i, o + n + i))
    # الطرف السفلي
    faces.append((o + n - 1, o + 2 * n - 1, io + 2 * n - 1, io + n - 1))
    return verts, faces


# ملامح التسريحات — كلها بوحدة u
STYLES: dict[str, dict] = {
    'long_straight': dict(drop=7.0, flare=1.05, wave=0.20, curl=0.35, cards=110,
                          width=0.30, taper=0.30, part='center'),
    'long_wavy':     dict(drop=6.6, flare=1.14, wave=0.72, curl=0.55, cards=120,
                          width=0.32, taper=0.34, part='side'),
    'long_curly':    dict(drop=5.4, flare=1.30, wave=1.30, curl=0.90, cards=150,
                          width=0.28, taper=0.42, part='center'),
    'shoulder':      dict(drop=4.2, flare=1.10, wave=0.50, curl=0.45, cards=105,
                          width=0.32, taper=0.34, part='side'),
    'bob':           dict(drop=2.5, flare=1.08, wave=0.28, curl=0.30, cards=95,
                          width=0.34, taper=0.40, part='center'),
    'pixie':         dict(drop=1.1, flare=1.04, wave=0.30, curl=0.25, cards=80,
                          width=0.30, taper=0.45, part='side'),
}


def build_scalp(head: HeadShape, hairline_phi: float = 0.86,
                swell: float = 0.05) -> tuple[np.ndarray, list]:
    """
    قشرة فروة داكنة تحت البطاقات.

    مهما زادت كثافة البطاقات بتفضل فيه فراغات صغيرة بينها، ولو بان الجلد
    من خلالها الشعر بيتقري «مستعار». الفروة الداكنة بتسدّها بلا تكلفة.
    """
    u = head.u
    n_t, n_p = 64, 22
    th = np.linspace(0, TAU, n_t, endpoint=False)
    # خط الشعر أوطى في الخلف وأعلى عند الوجه
    front = np.clip(-np.sin(th), 0, 1)
    phi_max = hairline_phi + 0.42 * (1.0 - front) - 0.10 * front
    verts = []
    for j in range(n_p):
        f = j / (n_p - 1)
        phi = f * phi_max
        verts.append(head.point(th, phi, swell=u * swell))
    verts = np.concatenate(verts, axis=0)
    idx = lambda r, c: r * n_t + (c % n_t)
    faces = [(idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c))
             for r in range(n_p - 1) for c in range(n_t)]
    return verts, faces


def build(head: HeadShape, style: str = 'long_wavy', seed: int = 11):
    """يبني كل بطاقات الشعر لتسريحة."""
    cfg = STYLES.get(style, STYLES['long_wavy'])
    rng = np.random.default_rng(seed)
    u = head.u

    all_v: list[np.ndarray] = []
    all_f: list[tuple] = []
    all_theta: list[np.ndarray] = []
    offset = 0

    n_cards = cfg['cards']
    # توزيع الخصل: كثافة أعلى في الخلف والجوانب، أقل عند الوجه
    for i in range(n_cards):
        # theta: −π/2 وجه · +π/2 خلف.
        # الفجوة الأمامية لازم تكون واسعة: خصلة عند 0.5 راديان من الوجه
        # اتجاهها الشعاعي لسه أمامي، فبتنسدل قدام الخد. 1.05 راديان
        # (≈60° لكل جانب) هو أقل مدى بيسيب الوش مكشوف.
        FRONT_GAP = 1.05
        frac = (i + 0.5) / n_cards
        theta = -np.pi / 2 + FRONT_GAP + frac * (TAU - 2 * FRONT_GAP)
        theta += rng.normal(0, 0.030)

        # phi0: نقطة البداية على الفروة — الطبقات المختلفة تبدأ من ارتفاعات مختلفة
        layer = i % 3
        phi0 = (0.18, 0.42, 0.66)[layer] + rng.uniform(-0.05, 0.05)

        # الحجم يزيد عند القمة: شعر ملتصق بالجمجمة بيبان مدهونًا
        crown = 1.0 - phi0 / 1.0
        swell = u * (0.10 + 0.07 * layer + 0.16 * max(crown, 0)) + rng.uniform(0, u * 0.04)
        drop = cfg['drop'] * rng.uniform(0.82, 1.12)
        w0 = u * cfg['width'] * rng.uniform(0.80, 1.25)
        w1 = w0 * cfg['taper']

        path = strand_path(head, theta, phi0,
                           drop=drop, flare=cfg['flare'], wave=cfg['wave'],
                           curl=cfg['curl'], n_pts=26, rng=rng, swell=swell)
        v, f = ribbon(path, w0, w1, u * 0.035, theta)
        all_v.append(v)
        all_theta.append(np.full(len(v), theta))
        all_f.extend([tuple(x + offset for x in face) for face in f])
        offset += len(v)

    return np.concatenate(all_v, axis=0), all_f, np.concatenate(all_theta)


def split_by_depth(verts: np.ndarray, faces: list, theta: np.ndarray,
                   back_span: float = 1.15):
    """
    يقسم بطاقات الشعر لطبقة خلفية وأمامية.

    ضروري للتركيب في اللعبة: الخصل اللي ورا الرأس لازم تُرسم **تحت** الجسم،
    واللي على الكتفين فوقه. بدون التقسيم، الشعر الخلفي بيظهر فوق الأكتاف.
    """
    is_back = np.abs(((theta - np.pi / 2 + np.pi) % TAU) - np.pi) < back_span

    def take(mask):
        sel = [f for f in faces if all(mask[i] for i in f)]
        if not sel:
            return np.zeros((0, 3)), []
        used = sorted({i for f in sel for i in f})
        remap = {o: n for n, o in enumerate(used)}
        return verts[used], [tuple(remap[i] for i in f) for f in sel]

    return take(is_back), take(~is_back)


def build_fringe(head: HeadShape, kind: str = 'side', seed: int = 23):
    """
    الغُرّة: بطاقات قصيرة تبدأ من خط الشعر الأمامي وتنسدل على الجبهة.
    قيد صارم: لا تنزل تحت `eye_z + 0.5u`.
    """
    if kind == 'none':
        return np.zeros((0, 3)), []
    rng = np.random.default_rng(seed)
    u = head.u
    floor = head.eye_z + u * 1.05

    n = 52
    all_v, all_f, offset = [], [], 0
    for i in range(n):
        f = (i + 0.5) / n
        theta = -np.pi / 2 + (f - 0.5) * 1.75
        theta += rng.normal(0, 0.03)
        phi0 = 0.26 + rng.uniform(-0.07, 0.09)

        x = (f - 0.5) * 2.0                     # −1 يسار .. +1 يمين
        if kind == 'blunt':
            length = 0.62 - 0.06 * abs(x)
        elif kind == 'curtain':
            length = 0.28 + 0.62 * abs(x) ** 1.2
        else:  # side — أطول ناحية واحدة
            length = 0.26 + 0.66 * np.clip((x + 0.85) / 1.7, 0, 1) ** 1.1

        # تنويع طول كل خصلة: الحافة المستوية تمامًا بتتقري «باروكة»
        length *= rng.uniform(0.72, 1.30)
        drop = length * 1.55
        w0 = u * 0.20 * rng.uniform(0.7, 1.35)
        path = strand_path(head, theta, phi0, drop=drop, flare=1.0,
                           wave=0.28, curl=0.15, n_pts=16, rng=rng,
                           swell=u * (0.07 + rng.uniform(0, 0.03)))
        # قصّ ناعم عند الحد الأدنى: القطع الحاد بيعمل خط أفقي صناعي
        below = path[:, 2] < floor
        if below.any():
            path[below, 2] = floor - (floor - path[below, 2]) * 0.12
        # كنسة جانبية للغُرّة الجانبية
        if kind == 'side':
            t = np.linspace(0, 1, len(path))
            path[:, 0] += t ** 1.3 * u * 0.55
        v, ff = ribbon(path, w0, w0 * 0.42, u * 0.028, theta)
        all_v.append(v)
        all_f.extend([tuple(a + offset for a in face) for face in ff])
        offset += len(v)
    return np.concatenate(all_v, axis=0), all_f
