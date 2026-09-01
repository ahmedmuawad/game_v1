"""محمّل OBJ خفيف يحافظ على المجموعات (groups) — بلا اعتماديات خارجية."""
from __future__ import annotations
import numpy as np
from pathlib import Path


class ObjMesh:
    def __init__(self, verts: np.ndarray, groups: dict[str, list[list[int]]]):
        self.verts = verts
        self.groups = groups

    def group_faces(self, *names: str) -> list[list[int]]:
        out: list[list[int]] = []
        for n in names:
            out.extend(self.groups.get(n, []))
        return out

    def extract(self, *names: str) -> tuple[np.ndarray, list[tuple[int, ...]]]:
        """يستخرج مجموعات محددة مع إعادة ترقيم الرؤوس المستخدمة فقط."""
        faces = self.group_faces(*names)
        used = sorted({i for f in faces for i in f})
        remap = {old: new for new, old in enumerate(used)}
        v = self.verts[used]
        f = [tuple(remap[i] for i in face) for face in faces]
        return v, f


def load_obj(path: str | Path) -> ObjMesh:
    verts: list[tuple[float, float, float]] = []
    groups: dict[str, list[list[int]]] = {}
    current = 'default'
    with open(path, 'r', encoding='utf-8', errors='replace') as fh:
        for line in fh:
            if not line or line[0] == '#':
                continue
            tag, _, rest = line.partition(' ')
            if tag == 'v':
                p = rest.split()
                verts.append((float(p[0]), float(p[1]), float(p[2])))
            elif tag == 'g':
                current = rest.strip()
                groups.setdefault(current, [])
            elif tag == 'f':
                idx = []
                for tok in rest.split():
                    s = tok.split('/')[0]
                    if not s:
                        continue
                    i = int(s)
                    idx.append(i - 1 if i > 0 else len(verts) + i)
                if len(idx) >= 3:
                    groups.setdefault(current, []).append(idx)
    return ObjMesh(np.asarray(verts, dtype=float), groups)
