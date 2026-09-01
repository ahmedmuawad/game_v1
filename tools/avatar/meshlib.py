"""
أدوات نمذجة برمجية بـ numpy فوق Blender.

الفكرة: بدل رسم الشبكات يدويًا، نبنيها من شبكة معلَّمة (u,v) ونشكّلها
بعمليات إزاحة موضعية ذات تلاشٍ ناعم. لأن كل رأس بيعرف إحداثياته (u,v)،
نقدر نستهدف مناطق بعينها (الخد، الفك، الجفن) بدقة.
"""
from __future__ import annotations
import numpy as np

TAU = np.pi * 2


def smoothstep(t: np.ndarray) -> np.ndarray:
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def falloff(dist: np.ndarray, radius: float, power: float = 1.0) -> np.ndarray:
    """تلاشٍ ناعم 1→0 من المركز حتى نصف القطر."""
    w = smoothstep(1.0 - np.clip(dist / max(radius, 1e-6), 0.0, 1.0))
    return w ** power if power != 1.0 else w


class UVSphere:
    """
    كرة معلَّمة. nu = عدد التقسيمات حول المحور، nv = من القطب للقطب.
    القطبان مدمجان لتفادي التمزّق.
    الوجه يتجه نحو -Y.
    """

    def __init__(self, nu: int = 96, nv: int = 76):
        self.nu, self.nv = nu, nv
        u = np.arange(nu) / nu * TAU
        v = np.linspace(0.0, np.pi, nv)
        self.U, self.V = np.meshgrid(u, v, indexing='xy')  # (nv, nu)
        self.theta = self.U.ravel()
        self.phi = self.V.ravel()
        sp, cp = np.sin(self.phi), np.cos(self.phi)
        self.verts = np.stack([sp * np.cos(self.theta), sp * np.sin(self.theta), cp], axis=1)

    # ---- معلومات موضعية مفيدة للاستهداف ----
    @property
    def front(self) -> np.ndarray:
        """1 عند مواجهة الكاميرا (-Y)، 0 عند الخلف."""
        return np.clip(-np.sin(self.theta), 0.0, 1.0)

    @property
    def side(self) -> np.ndarray:
        """قيمة موقّعة: +1 يمين (+X)، -1 شمال."""
        return np.cos(self.theta)

    def faces(self) -> list[tuple[int, ...]]:
        nu, nv = self.nu, self.nv
        idx = lambda r, c: r * nu + (c % nu)
        out = []
        for r in range(nv - 1):
            for c in range(nu):
                a, b, cc, d = idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)
                if r == 0:
                    out.append((a, cc, d))
                elif r == nv - 2:
                    out.append((a, b, cc))
                else:
                    out.append((a, b, cc, d))
        return out

    # ---- عمليات التشكيل ----
    def push(self, center, radius: float, direction, amount: float, power: float = 1.0,
             mask: np.ndarray | None = None) -> None:
        """يزيح الرؤوس القريبة من `center` باتجاه `direction` بمقدار متلاشٍ."""
        c = np.asarray(center, dtype=float)
        d = np.asarray(direction, dtype=float)
        n = np.linalg.norm(d)
        if n > 0:
            d = d / n
        dist = np.linalg.norm(self.verts - c, axis=1)
        w = falloff(dist, radius, power)
        if mask is not None:
            w = w * mask
        self.verts += (w * amount)[:, None] * d

    def inflate(self, center, radius: float, amount: float, power: float = 1.0,
                mask: np.ndarray | None = None) -> None:
        """يزيح للخارج على امتداد المتجه الشعاعي — لنفخ/تفريغ منطقة."""
        c = np.asarray(center, dtype=float)
        dist = np.linalg.norm(self.verts - c, axis=1)
        w = falloff(dist, radius, power)
        if mask is not None:
            w = w * mask
        radial = self.verts - np.array([0.0, 0.0, self.verts[:, 2].mean()])
        norm = np.linalg.norm(radial, axis=1, keepdims=True)
        radial = radial / np.maximum(norm, 1e-6)
        self.verts += (w * amount)[:, None] * radial

    def scale_band(self, z_center: float, z_radius: float, sx: float, sy: float,
                   power: float = 1.0) -> None:
        """يوسّع/يضيّق شريحة أفقية — للفك، الخدود، الجمجمة."""
        dist = np.abs(self.verts[:, 2] - z_center)
        w = falloff(dist, z_radius, power)
        self.verts[:, 0] *= (1.0 + w * (sx - 1.0))
        self.verts[:, 1] *= (1.0 + w * (sy - 1.0))



    def cranium_profile(self, half_height: float, exponent_top: float = 2.5,
                        exponent_bottom: float = 2.05) -> None:
        """
        يستبدل المقطع الجانبي الكروي بمقطع «فوق-بيضاوي».

        الكرة بتدي جمجمة مدببة من فوق زي البيضة — والجمجمة البشرية مستديرة
        وممتلئة. الأس الأعلى بيملأ القمة، والأس الأدنى بيحافظ على تناقص الذقن.
        """
        nz = np.clip(self.verts[:, 2] / half_height, -1.0, 1.0)
        sphere_r = np.sqrt(np.maximum(1.0 - nz ** 2, 1e-9))
        p = np.where(nz >= 0, exponent_top, exponent_bottom)
        target_r = np.power(np.maximum(1.0 - np.abs(nz) ** p, 1e-9), 1.0 / p)
        k = (target_r / sphere_r)[:, None]
        self.verts[:, 0:2] *= k

    def push_face(self, x: float, z: float, radius: float, direction, amount: float,
                  power: float = 1.0, front_power: float = 2.0,
                  z_scale: float = 1.0) -> None:
        """
        نحت ملمح على واجهة الوجه.

        الاستهداف بمسافة في مستوى XZ فقط (بتجاهل العمق) — ده أهم فرق عن
        المسافة ثلاثية الأبعاد: يضمن إن كل رؤوس السطح الأمامي عند هذا
        الموقع تتأثر، بغض النظر عن عمق السطح هناك، فمش محتاجين نعرف
        إحداثي Y للسطح مسبقًا.

        `front_power` يقصر التأثير على الواجهة الأمامية ويمنع تشويه المؤخرة.
        """
        d = np.asarray(direction, dtype=float)
        n = np.linalg.norm(d)
        if n > 0:
            d = d / n
        dx = self.verts[:, 0] - x
        dz = (self.verts[:, 2] - z) / max(z_scale, 1e-6)
        dist = np.sqrt(dx * dx + dz * dz)
        w = falloff(dist, radius, power) * (self.front ** front_power)
        self.verts += (w * amount)[:, None] * d

    def mirror_face(self, x: float, z: float, radius: float, direction, amount: float,
                    power: float = 1.0, front_power: float = 2.0,
                    z_scale: float = 1.0) -> None:
        """نفس النحت على جانبي الوجه — يضمن التماثل التام."""
        dx, dy, dz = direction
        self.push_face(abs(x), z, radius, (abs(dx), dy, dz), amount, power, front_power, z_scale)
        self.push_face(-abs(x), z, radius, (-abs(dx), dy, dz), amount, power, front_power, z_scale)

    def surface_y(self, x: float, z: float) -> float:
        """أقرب إحداثي Y أمامي عند (x, z) — لوضع العيون والملحقات بدقة."""
        dx = self.verts[:, 0] - x
        dz = self.verts[:, 2] - z
        d2 = dx * dx + dz * dz
        frontish = self.front > 0.75
        if not frontish.any():
            return float(self.verts[:, 1].min())
        idx = np.where(frontish)[0]
        best = idx[np.argmin(d2[idx])]
        return float(self.verts[best, 1])

    def mirror_push(self, center, radius: float, direction, amount: float,
                    power: float = 1.0, mask: np.ndarray | None = None) -> None:
        """يطبّق نفس الإزاحة على جانبي الوجه — يضمن التماثل."""
        cx, cy, cz = center
        dx, dy, dz = direction
        self.push((abs(cx), cy, cz), radius, (abs(dx), dy, dz), amount, power, mask)
        self.push((-abs(cx), cy, cz), radius, (-abs(dx), dy, dz), amount, power, mask)


def revolve(profile: np.ndarray, nu: int = 64, close_bottom: bool = True):
    """
    يدوّر مقطعًا جانبيًا (نقاط [radius, z]) حول محور Z.
    يُستخدم للرقبة والأطراف والأواني.
    """
    nv = len(profile)
    theta = np.arange(nu) / nu * TAU
    r = profile[:, 0][:, None]
    z = profile[:, 1][:, None]
    x = r * np.cos(theta)[None, :]
    y = r * np.sin(theta)[None, :]
    zz = np.repeat(z, nu, axis=1)
    verts = np.stack([x.ravel(), y.ravel(), zz.ravel()], axis=1)
    idx = lambda rr, cc: rr * nu + (cc % nu)
    faces = [(idx(rr, c), idx(rr, c + 1), idx(rr + 1, c + 1), idx(rr + 1, c))
             for rr in range(nv - 1) for c in range(nu)]
    if close_bottom:
        faces.append(tuple(idx(nv - 1, c) for c in range(nu)))
    return verts, faces


def loft(sections: list[np.ndarray], close: bool = True):
    """
    يصل مقاطع عرضية متتالية (كل مقطع مصفوفة نقاط 3D بنفس العدد) لتكوين سطح.
    الأساس لبناء الجسم والملابس.
    """
    n = len(sections[0])
    verts = np.concatenate(sections, axis=0)
    idx = lambda r, c: r * n + (c % n)
    faces = []
    rng = range(n) if close else range(n - 1)
    for r in range(len(sections) - 1):
        for c in rng:
            faces.append((idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c)))
    return verts, faces


def ellipse_section(cx: float, cy: float, cz: float, rx: float, ry: float,
                    n: int = 48, squash_front: float = 1.0, squash_back: float = 1.0) -> np.ndarray:
    """
    مقطع عرضي بيضاوي مع تحكّم منفصل في عمق الأمام والخلف —
    ضروري لأن جسم الإنسان مش بيضاوي متماثل.
    """
    t = np.arange(n) / n * TAU
    x = np.cos(t) * rx
    y = np.sin(t) * ry
    y = np.where(y < 0, y * squash_front, y * squash_back)
    return np.stack([x + cx, y + cy, np.full(n, cz)], axis=1)


def superellipse_section(cx, cy, cz, rx, ry, n=48, exponent=2.4,
                         squash_front=1.0, squash_back=1.0) -> np.ndarray:
    """
    مقطع «مربّع الحواف» — أقرب لشكل الجذع البشري من البيضاوي البسيط.
    exponent=2 يعطي بيضاويًا، وكل زيادة تجعل الحواف أكثر امتلاءً.
    """
    t = np.arange(n) / n * TAU
    ct, st = np.cos(t), np.sin(t)
    x = np.sign(ct) * (np.abs(ct) ** (2.0 / exponent)) * rx
    y = np.sign(st) * (np.abs(st) ** (2.0 / exponent)) * ry
    y = np.where(y < 0, y * squash_front, y * squash_back)
    return np.stack([x + cx, y + cy, np.full(n, cz)], axis=1)


def smooth_curve(keys: list[tuple[float, float]], samples: int) -> np.ndarray:
    """استيفاء ناعم (Catmull-Rom مبسّط) لمنحنى المقاطع."""
    ks = np.array(sorted(keys), dtype=float)
    t = np.linspace(ks[0, 0], ks[-1, 0], samples)
    return np.interp(t, ks[:, 0], ks[:, 1])


def sphere_face_uvs(nu: int, nv: int) -> list[list[tuple[float, float]]]:
    """
    إحداثيات UV لكل ركن في كل وجه، بنفس ترتيب UVSphere.faces().

    السبب في العمل على مستوى الوجه لا الرأس: العمود الأخير بيلتف على
    العمود الأول (c+1 == nu)، ولو استخدمنا UV للرأس هيتولّد شريط ممسوح
    على جانب الرأس. هنا بنمنح الركن الملتف u=1.0 بدل 0.0.
    """
    def uv(r: int, c: int) -> tuple[float, float]:
        return (c / nu, 1.0 - r / (nv - 1))

    out: list[list[tuple[float, float]]] = []
    for r in range(nv - 1):
        for c in range(nu):
            a, b, cc, d = uv(r, c), uv(r, c + 1), uv(r + 1, c + 1), uv(r + 1, c)
            if r == 0:
                out.append([a, cc, d])
            elif r == nv - 2:
                out.append([a, b, cc])
            else:
                out.append([a, b, cc, d])
    return out
