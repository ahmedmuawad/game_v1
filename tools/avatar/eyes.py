"""
بناء العين.

العين أكتر عنصر بيحدد إذا كانت الشخصية «حيّة» ولا لأ، وأكتر عنصر
بيفضح الأخطاء الصغيرة: انحراف بؤبؤ نص مليمتر بيخلي النظرة غريبة.

لذلك مفيش أي قيمة مخمّنة هنا:
- مركز ونصف قطر كرة العين بيتحسبوا بملاءمة كرة بالمربعات الصغرى
  على الهندسة المساعدة الأصلية.
- اتجاه القزحية بيتحسب من مركز الكرة نحو **منتصف فتحة الجفن**،
  مش نحو الأمام افتراضيًا — فلو الجفون اتحركت (تعبير أو تنميط)
  القزحية بتفضل في مكانها الصح تلقائيًا.
"""
from __future__ import annotations
import numpy as np


def fit_sphere(pts: np.ndarray) -> tuple[np.ndarray, float]:
    """ملاءمة كرة بالمربعات الصغرى — أدق من مركز الكتلة لشبكة غير منتظمة."""
    A = np.hstack([2 * pts, np.ones((len(pts), 1))])
    f = (pts ** 2).sum(axis=1)
    sol, *_ = np.linalg.lstsq(A, f, rcond=None)
    c = sol[:3]
    r = float(np.sqrt(max(sol[3] + (c ** 2).sum(), 1e-12)))
    return c, r


def _basis(direction: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """يبني إطارًا متعامدًا حول اتجاه النظر."""
    d = direction / max(np.linalg.norm(direction), 1e-12)
    up = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(d, up))) > 0.94:
        up = np.array([0.0, 1.0, 0.0])
    right = np.cross(up, d)
    right /= max(np.linalg.norm(right), 1e-12)
    up2 = np.cross(d, right)
    return d, right, up2


def uv_sphere(center: np.ndarray, radius: float, n_u: int = 48, n_v: int = 36):
    """كرة عين ناعمة — نبنيها بدل استخدام الهندسة المساعدة منخفضة الدقة."""
    u = np.arange(n_u) / n_u * 2 * np.pi
    v = np.linspace(0, np.pi, n_v)
    U, V = np.meshgrid(u, v, indexing='xy')
    sp, cp = np.sin(V).ravel(), np.cos(V).ravel()
    th = U.ravel()
    pts = np.stack([sp * np.cos(th), sp * np.sin(th), cp], axis=1) * radius + center
    idx = lambda r, c: r * n_u + (c % n_u)
    faces = []
    for r in range(n_v - 1):
        for c in range(n_u):
            a, b, cc, d = idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)
            if r == 0:
                faces.append((a, cc, d))
            elif r == n_v - 2:
                faces.append((a, b, cc))
            else:
                faces.append((a, b, cc, d))
    return pts, faces


def disc_on_sphere(center: np.ndarray, sphere_r: float, direction: np.ndarray,
                   disc_r: float, *, lift: float = 0.0, bulge: float = 0.0,
                   n_seg: int = 44, n_ring: int = 8):
    """
    قرص مقبّب ملتصق بسطح الكرة ومتعامد على اتجاه النظر.
    يُستخدم للقزحية والبؤبؤ.
    """
    d, right, up = _basis(direction)
    verts = [center + d * (sphere_r + lift + bulge)]
    for ring in range(1, n_ring + 1):
        rr = disc_r * ring / n_ring
        depth = np.sqrt(max(sphere_r ** 2 - rr ** 2, 1e-12))
        b = bulge * (1.0 - (ring / n_ring) ** 2)
        for i in range(n_seg):
            a = i / n_seg * 2 * np.pi
            verts.append(center + right * (np.cos(a) * rr) + up * (np.sin(a) * rr)
                         + d * (depth + lift + b))
    verts = np.array(verts)
    faces = [(0, 1 + i, 1 + (i + 1) % n_seg) for i in range(n_seg)]
    for ring in range(n_ring - 1):
        b0, b1 = 1 + ring * n_seg, 1 + (ring + 1) * n_seg
        for i in range(n_seg):
            j = (i + 1) % n_seg
            faces.append((b0 + i, b0 + j, b1 + j, b1 + i))
    return verts, faces


class Eye:
    """عين واحدة جاهزة للبناء."""

    def __init__(self, center: np.ndarray, radius: float, gaze: np.ndarray):
        self.center = center
        self.radius = radius
        self.gaze = gaze / max(np.linalg.norm(gaze), 1e-12)

    @classmethod
    def from_mesh(cls, helper_pts: np.ndarray, upper_lid: np.ndarray,
                  lower_lid: np.ndarray, *, scale: float = 0.90,
                  seat: float = 0.30, max_seat: float = 0.55) -> 'Eye':
        """
        يستنتج العين من الهندسة المساعدة ونقطتي الجفن.

        `seat` بيقرّب الكرة من مستوى فتحة الجفن. الهندسة المساعدة في
        الشبكة الأصلية مجرد وكيل صغير موضوع عميق في المحجر — لو استخدمناه
        كما هو، القرنية بتفضل خلف الجفون والعين تبان مغمضة. القيمة كسر من
        المسافة بين مركز الكرة ومنتصف فتحة الجفن.
        """
        c, r = fit_sphere(helper_pts)
        r = r * scale
        opening = (np.asarray(upper_lid) + np.asarray(lower_lid)) / 2.0
        gaze = opening - c
        n = float(np.linalg.norm(gaze))
        if n < 1e-9:
            gaze = np.array([0.0, -1.0, 0.0])
            n = 1.0
        gaze = gaze / n
        # ندفع المركز للأمام بحيث تصل القرنية لمستوى فتحة الجفن تقريبًا
        # سقف على الدفع بنسبة من نصف القطر: بعد مورفات الملامح ممكن
        # تكبر المسافة لفتحة الجفن فيندفع المركز أكتر من اللازم
        push = min(max(n - r, 0.0) * seat, r * max_seat)
        c = c + gaze * push
        return cls(c, r, gaze)

    def sclera(self):
        return uv_sphere(self.center, self.radius)

    def iris(self, scale: float = 0.52):
        return disc_on_sphere(self.center, self.radius, self.gaze,
                              self.radius * scale, lift=0.00012,
                              bulge=self.radius * 0.055)

    def pupil(self, scale: float = 0.22):
        return disc_on_sphere(self.center, self.radius, self.gaze,
                              self.radius * scale, lift=0.00030,
                              bulge=self.radius * 0.055)

    def highlight(self, scale: float = 0.13, offset=(0.42, 0.46)):
        """
        بريق ضوء صغير ثابت أعلى القزحية.

        الإضاءة بتنتج بريقًا لوحدها، بس بريقًا هندسيًا مضمونًا بيخلي
        العين حيّة في كل الزوايا والإضاءات — وده اللي بيفرق بين نظرة
        حيّة ونظرة زجاجية.
        """
        d, right, up = _basis(self.gaze)
        off = right * (self.radius * offset[0]) + up * (self.radius * offset[1])
        c = self.center + off
        # إسقاط على سطح الكرة
        v = c - self.center
        v = v / max(np.linalg.norm(v), 1e-12)
        surf = self.center + v * self.radius
        return disc_on_sphere(surf - v * self.radius * 0.02, self.radius * 0.30,
                              v, self.radius * scale, lift=self.radius * 0.02,
                              n_seg=24, n_ring=4)
