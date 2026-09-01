"""
نظام تعابير الوجه.

التعبير الافتراضي للشبكة التشريحية محايد تمامًا — وده بيتقري «متجهم»
في سياق لعبة. الابتسامة مش مجرد رفع زوايا الفم: لازم ترفع الخد، تعمّق
ثنية الأنف-الشفة، وتضيّق الجفن السفلي (ابتسامة دوشين). من غير الجفن،
الابتسامة بتبان مزيّفة.

كل الأنصاف أقطار بوحدة المسافة بين العينين (interocular) — فالنظام
بيشتغل صح مع أي مقياس أو نسب رأس.
"""
from __future__ import annotations
import numpy as np


class FaceRig:
    """يستخرج النقاط التشريحية اللازمة للتعبير من الشبكة المُنمَّطة."""

    def __init__(self, base, verts: np.ndarray):
        self.verts = verts
        J = {}
        for name, faces in base.mesh.groups.items():
            if name.startswith('joint-'):
                idx = sorted({i for f in faces for i in f})
                J[name[6:]] = verts[idx].mean(0)
        self.J = J

        self.eye_l, self.eye_r = J['l-eye'], J['r-eye']
        self.inter = float(np.linalg.norm(self.eye_l - self.eye_r))
        self.eye_mid = (self.eye_l + self.eye_r) / 2

        body_idx = base.group_indices('body')
        bv = verts[body_idx]
        self.body_idx = body_idx

        # ---- خط الفم من هندسة الأسنان ----
        # مفصل `joint-mouth` هو محور دوران الفك، مش خط الشفاه — الفرق
        # بينهم ثلث وحدة عين، وده كفاية إن لون الشفايف ينزف على الأنف
        # والابتسامة تتطبّق فوق مكانها. الأسنان بتحدد الخط تشريحيًا.
        def _grp(name):
            faces = base.mesh.group_faces(name)
            idx = sorted({i for f in faces for i in f})
            return verts[idx] if idx else None

        ut, lt = _grp('helper-upper-teeth'), _grp('helper-lower-teeth')
        if ut is not None and lt is not None:
            self.lip_z = float((ut[:, 2].min() + lt[:, 2].max()) / 2)
            self.mouth_half_w = float(max(np.abs(ut[:, 0]).max(),
                                          np.abs(lt[:, 0]).max())) * 1.32
        else:
            self.lip_z = float(J['mouth'][2] - self.inter * 0.32)
            self.mouth_half_w = self.inter * 0.62

        band = bv[(np.abs(bv[:, 2] - self.lip_z) < self.inter * 0.22)
                  & (np.abs(bv[:, 0]) < self.inter * 0.55)]
        self.lip_front_y = float(band[:, 1].min()) if len(band) else float(J['mouth'][1])
        self.lip_center = np.array([0.0, self.lip_front_y, self.lip_z])

    # ---- أدوات الإزاحة ----
    def _w(self, center, radius, power: float = 1.0, front_only: bool = True) -> np.ndarray:
        d = np.linalg.norm(self.verts - np.asarray(center), axis=1)
        w = np.clip(1.0 - d / max(radius, 1e-9), 0, 1)
        w = w * w * (3 - 2 * w)
        if power != 1.0:
            w = w ** power
        if front_only:
            # يقصر التأثير على واجهة الوجه فقط
            depth = np.clip((self.eye_mid[1] * 0.4 - self.verts[:, 1]) / (self.inter * 1.6), 0, 1)
            w = w * depth
        return w

    def push(self, verts, center, radius, direction, amount, power=1.0, front_only=True):
        d = np.asarray(direction, dtype=float)
        n = np.linalg.norm(d)
        if n > 0:
            d = d / n
        w = self._w(center, radius, power, front_only)
        verts += (w * amount)[:, None] * d
        return verts

    def mirror(self, verts, center, radius, direction, amount, power=1.0, front_only=True):
        cx, cy, cz = center
        dx, dy, dz = direction
        verts = self.push(verts, (abs(cx), cy, cz), radius, (abs(dx), dy, dz), amount, power, front_only)
        verts = self.push(verts, (-abs(cx), cy, cz), radius, (-abs(dx), dy, dz), amount, power, front_only)
        return verts

    # ---- المعالم ----
    def mouth_corner(self, side: int) -> np.ndarray:
        return np.array([side * self.mouth_half_w, self.lip_front_y + self.inter * 0.10, self.lip_z])

    def cheek(self, side: int) -> np.ndarray:
        return np.array([side * self.inter * 0.72,
                         self.lip_front_y + self.inter * 0.22,
                         self.lip_z + self.inter * 0.52])

    def lower_lid(self, side: int) -> np.ndarray:
        e = self.eye_l if side > 0 else self.eye_r
        return e + np.array([0.0, -self.inter * 0.30, -self.inter * 0.16])

    def brow(self, side: int) -> np.ndarray:
        e = self.eye_l if side > 0 else self.eye_r
        return e + np.array([side * self.inter * 0.05, -self.inter * 0.26, self.inter * 0.40])


def apply_expression(rig: FaceRig, verts: np.ndarray, kind: str = 'smile',
                     strength: float = 1.0) -> np.ndarray:
    """يطبّق تعبيرًا على نسخة من الرؤوس ويرجّعها."""
    v = verts.copy()
    u = rig.inter          # وحدة القياس
    s = strength

    if kind in ('smile', 'happy', 'warm'):
        big = 1.0 if kind == 'smile' else (1.45 if kind == 'happy' else 0.62)
        a = s * big

        # 1. زوايا الفم: لأعلى وللخارج وللخلف قليلًا
        for side in (1, -1):
            c = rig.mouth_corner(side)
            v = rig.push(v, c, u * 0.44, (side * 0.42, 0.30, 1.0), u * 0.30 * a, power=1.15)
        # 2. خط الشفاه يتقوّس لأعلى في المنتصف قليلًا
        v = rig.push(v, rig.lip_center, u * 0.52, (0, 0, 1), u * 0.055 * a, power=1.4)
        # 3. الشفة العليا ترتفع وترفّع قليلًا
        upper = rig.lip_center + np.array([0, 0, u * 0.13])
        v = rig.push(v, upper, u * 0.44, (0, -0.35, 1.0), u * 0.085 * a, power=1.2)
        # 4. الشفة السفلى تتسطح قليلًا وتنسحب
        lower = rig.lip_center + np.array([0, 0, -u * 0.15])
        v = rig.push(v, lower, u * 0.42, (0, 1, 0.25), u * 0.060 * a, power=1.2)
        # 5. رفع الخدين (اللي بيدي الدفء الحقيقي)
        for side in (1, -1):
            v = rig.push(v, rig.cheek(side), u * 0.80, (side * 0.22, -0.72, 0.60),
                         u * 0.175 * a, power=1.25)
        # 6. تعميق ثنية الأنف-الشفة
        for side in (1, -1):
            fold = rig.mouth_corner(side) + np.array([side * u * 0.10, 0, u * 0.28])
            v = rig.push(v, fold, u * 0.36, (side * -0.30, 1.0, 0), u * 0.070 * a, power=1.2)
        # 7. ابتسامة دوشين: الجفن السفلي يرتفع والعين تضيق قليلًا
        for side in (1, -1):
            v = rig.push(v, rig.lower_lid(side), u * 0.46, (0, -0.25, 1.0),
                         u * 0.105 * a, power=1.2)
        # 8. الحاجب يرتاح لأعلى قليلًا (يزيل التجهّم)
        for side in (1, -1):
            v = rig.push(v, rig.brow(side), u * 0.62, (0, -0.15, 1.0), u * 0.060 * a, power=1.2)

    elif kind == 'surprised':
        for side in (1, -1):
            v = rig.push(v, rig.brow(side), u * 0.70, (0, -0.2, 1.0), u * 0.13 * s, power=1.2)
            e = rig.eye_l if side > 0 else rig.eye_r
            v = rig.push(v, e + np.array([0, -u * 0.28, u * 0.24]), u * 0.42, (0, 0, 1),
                         u * 0.055 * s, power=1.2)
        v = rig.push(v, rig.lip_center, u * 0.50, (0, 0, -1), u * 0.10 * s, power=1.2)
        v = rig.push(v, rig.lip_center + np.array([0, 0, -u * 0.20]), u * 0.42, (0, 0, -1),
                     u * 0.070 * s, power=1.2)

    elif kind == 'sad':
        for side in (1, -1):
            c = rig.mouth_corner(side)
            v = rig.push(v, c, u * 0.44, (0, 0.15, -1.0), u * 0.075 * s, power=1.15)
            inner = rig.brow(side) + np.array([-side * u * 0.34, 0, 0])
            v = rig.push(v, inner, u * 0.42, (0, -0.1, 1.0), u * 0.055 * s, power=1.2)
            v = rig.push(v, rig.brow(side) + np.array([side * u * 0.30, 0, 0]), u * 0.40,
                         (0, 0, -1), u * 0.040 * s, power=1.2)

    elif kind == 'thinking':
        v = rig.mirror(v, rig.mouth_corner(1), u * 0.40, (0.2, 0.4, 0.6), u * 0.030 * s)
        v = rig.push(v, rig.brow(1), u * 0.52, (0, -0.1, 1.0), u * 0.055 * s, power=1.2)
        v = rig.push(v, rig.brow(-1), u * 0.52, (0, 0, -1), u * 0.022 * s, power=1.2)

    return v


def open_eyes(rig: FaceRig, verts: np.ndarray, amount: float = 1.0,
              exclude: np.ndarray | None = None) -> np.ndarray:
    """
    فتح فتحة الجفن.

    الشبكة التشريحية المحايدة عيونها شبه مغمضة — صحيح تشريحيًا لكنه
    بيتقري «نعسان» في لعبة.

    الطريقة: تمديد رأسي حول مركز العين بدل دفع جلد الجفن. الدفع الموضعي
    بيحرّك الجلد بس، فالفتحة بتفضل بنفس الارتفاع تقريبًا؛ أما التمديد
    فبيفتح الفتحة فعليًا مع الجلد المحيط، وده اللي بيقرا طبيعي.

    `exclude` = مؤشرات رؤوس كرة العين — لازم تُستثنى وإلا الكرة تتشوّه.
    مورفة دائمة (سمة شخصية)، مش تعبيرًا مؤقتًا.
    """
    v = verts.copy()
    u = rig.inter
    stretch = 1.0 + 0.30 * amount
    widen = 1.0 + 0.09 * amount

    mask_out = np.zeros(len(v), dtype=bool)
    if exclude is not None:
        mask_out[exclude] = True

    for eye in (rig.eye_l, rig.eye_r):
        d = np.linalg.norm((v - eye) / np.array([u * 1.05, u * 1.30, u * 0.85]), axis=1)
        w = np.clip(1.0 - d, 0, 1)
        w = w * w * (3 - 2 * w)
        w[mask_out] = 0.0
        # تمديد رأسي حول مركز العين
        v[:, 2] += (v[:, 2] - eye[2]) * (stretch - 1.0) * w
        # توسيع أفقي خفيف
        v[:, 0] += (v[:, 0] - eye[0]) * (widen - 1.0) * w

    # ترقيق حافة الجفن العلوي: يمنع الجفن من التسمّك بعد التمديد
    for side in (1, -1):
        up = rig.J['l-upperlid' if side > 0 else 'r-upperlid']
        v = rig.push(v, up, u * 0.30, (0, 0.35, 0.55), u * 0.030 * amount, power=1.2)

    return v
