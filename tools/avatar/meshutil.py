"""أدوات هندسية مشتركة: ناظميات، أقنعة، بناء قشرات من مناطق."""
from __future__ import annotations
import numpy as np


def vertex_normals(verts: np.ndarray, faces: list) -> np.ndarray:
    """ناظمي لكل رأس = متوسط ناظميات الأوجه المجاورة موزونًا بمساحتها."""
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


def dist_to_segment(pts: np.ndarray, a: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """المسافة لكل نقطة عن قطعة مستقيمة، مع الموضع النسبي t على القطعة."""
    ab = b - a
    L2 = float(ab @ ab)
    if L2 < 1e-12:
        return np.linalg.norm(pts - a, axis=1), np.zeros(len(pts))
    t = np.clip(((pts - a) @ ab) / L2, 0.0, 1.0)
    proj = a[None, :] + t[:, None] * ab[None, :]
    return np.linalg.norm(pts - proj, axis=1), t


def dist_to_polyline(pts: np.ndarray, line: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    """
    أقرب مسافة لسلسلة قطع، مع الطول المقطوع على امتداد السلسلة.
    يُستخدم لتحديد الذراع والساق: الطرف أسطوانة حول محوره.
    """
    best_d = np.full(len(pts), np.inf)
    best_s = np.zeros(len(pts))
    lengths = [float(np.linalg.norm(line[i + 1] - line[i])) for i in range(len(line) - 1)]
    acc = 0.0
    for i in range(len(line) - 1):
        d, t = dist_to_segment(pts, line[i], line[i + 1])
        s = acc + t * lengths[i]
        m = d < best_d
        best_d[m] = d[m]
        best_s[m] = s[m]
        acc += lengths[i]
    return best_d, best_s


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def build_adjacency(n_verts: int, faces: list) -> list[list[int]]:
    adj: list[set[int]] = [set() for _ in range(n_verts)]
    for f in faces:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            adj[a].add(b)
            adj[b].add(a)
    return [sorted(a) for a in adj]


def laplacian_smooth(verts: np.ndarray, faces: list, iterations: int = 6,
                     factor: float = 0.55, boundary_factor: float = 0.0) -> np.ndarray:
    """
    تنعيم لابلاسي: كل رأس بيتحرك ناحية متوسط جيرانه.

    ده اللي بيحوّل «إزاحة من الجسم» إلى «قماش منسدل». الإزاحة على امتداد
    الناظمي بتحافظ على كل تفاصيل الجسم تحت القماش، فالقطعة بتتقري طلاءً
    على الجلد. التنعيم بيمسح التفاصيل دي ويسيب سطحًا هادئًا زي القماش.

    `boundary_factor` بيتحكم في تنعيم رؤوس الحافة: صفر بيثبّتها (فتفضل
    الحاشية متعرّجة على حواف المضلعات)، وقيمة صغيرة بتنعّم شكل الحاشية
    نفسها بدون ما القطعة تتقلّص.
    """
    adj = build_adjacency(len(verts), faces)
    is_boundary = np.zeros(len(verts), dtype=bool)
    edge_count: dict[tuple[int, int], int] = {}
    for f in faces:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            key = (a, b) if a < b else (b, a)
            edge_count[key] = edge_count.get(key, 0) + 1
    for (a, b), c in edge_count.items():
        if c == 1:
            is_boundary[a] = True
            is_boundary[b] = True

    # رؤوس الحافة تُنعَّم مع جيرانها على الحافة فقط، عشان شكل الحاشية
    # ينعم بدون ما القطعة تنكمش للداخل
    boundary_adj: list[list[int]] = [[] for _ in range(len(verts))]
    for (a, b), c in edge_count.items():
        if c == 1:
            boundary_adj[a].append(b)
            boundary_adj[b].append(a)

    per_vertex = np.where(is_boundary, boundary_factor, factor)

    v = verts.copy()
    for _ in range(iterations):
        avg = np.zeros_like(v)
        for i in range(len(v)):
            nb = boundary_adj[i] if is_boundary[i] else adj[i]
            avg[i] = v[nb].mean(axis=0) if nb else v[i]
        v += (avg - v) * per_vertex[:, None]
    return v


def region_shell(verts: np.ndarray, faces: list, normals: np.ndarray,
                 weight: np.ndarray, thickness: np.ndarray | float,
                 inner_gap: float = 0.0012, smooth: int = 0,
                 smooth_factor: float = 0.55,
                 min_gap: float = 0.0025) -> tuple[np.ndarray, list]:
    """
    يبني قطعة ملابس كقشرة مصمتة من **منطقة على الجسم**.

    ده جوهر توليد الهدوم برمجيًا: القطعة مش شبكة منفصلة تحتاج تفصيل يدوي،
    هي نسخة من جلد الجسم مُزاحة للخارج. النتيجة إنها بتتفصّل على المقاس
    تلقائيًا مهما اتغيّرت نسب الشخصية، وإضافة قطعة جديدة بتبقى تعريف
    قناع + سماكة + لون.

    - `weight`: قناع 0..1 لكل رأس (يحدد شكل القطعة وحدودها)
    - `thickness`: سماكة القماش (رقم أو قيمة لكل رأس)
    - يُبنى سطح خارجي وداخلي، وتُخاط الحواف الحرة عشان القطعة تبقى مصمتة
    """
    t = np.asarray(thickness, dtype=float)
    if t.ndim == 0:
        t = np.full(len(verts), float(t))

    outer = verts + normals * (t * weight)[:, None]
    inner = verts + normals * (inner_gap * (weight > 0))[:, None]

    # اختيار الأوجه بمتوسط وزن رؤوسها لا بشرط تحققه في كلها.
    # شرط `all` بيقصّ صفًا كاملًا من الأوجه عند الحدود فتطلع حافة مسننة
    # وشقوق عند الكتف؛ المتوسط بيدي حدًا نظيفًا.
    wf = np.array([float(np.mean([weight[i] for i in f])) for f in faces])
    sel = [f for f, m in zip(faces, wf) if m > 0.34]
    if not sel:
        return np.zeros((0, 3)), []

    used = sorted({i for f in sel for i in f})
    remap = {o: n for n, o in enumerate(used)}
    n_used = len(used)

    sel_faces_local = [tuple(remap[i] for i in f) for f in sel]
    out_sel = outer[used]
    if smooth > 0:
        out_sel = laplacian_smooth(out_sel, sel_faces_local, iterations=smooth,
                                   factor=smooth_factor, boundary_factor=0.45)
        # التنعيم ممكن يسحب السطح جوه الجسم — نضمن حدًا أدنى للخلوص
        n_sel = normals[used]
        base_sel = verts[used]
        along = np.einsum('ij,ij->i', out_sel - base_sel, n_sel)
        deficit = np.maximum(min_gap - along, 0.0)
        out_sel = out_sel + n_sel * deficit[:, None]

    v = np.concatenate([out_sel, inner[used]], axis=0)
    out_faces: list[tuple[int, ...]] = []
    for f in sel:
        idx = [remap[i] for i in f]
        out_faces.append(tuple(idx))                                   # خارجي
        out_faces.append(tuple(reversed([i + n_used for i in idx])))   # داخلي (مقلوب)

    # خياطة الحواف الحرة: الضلع اللي بيخص وجهًا واحدًا فقط
    edge_count: dict[tuple[int, int], int] = {}
    edge_dir: dict[tuple[int, int], tuple[int, int]] = {}
    for f in sel:
        idx = [remap[i] for i in f]
        for k in range(len(idx)):
            a, b = idx[k], idx[(k + 1) % len(idx)]
            key = (a, b) if a < b else (b, a)
            edge_count[key] = edge_count.get(key, 0) + 1
            edge_dir.setdefault(key, (a, b))
    for key, count in edge_count.items():
        if count != 1:
            continue
        a, b = edge_dir[key]
        out_faces.append((a, b, b + n_used, a + n_used))

    return v, out_faces
