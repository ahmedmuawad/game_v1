"""
تجميع الشخصية الكاملة في مشهد Blender.

نقطة واحدة تبني الشخصية من مواصفة (Look)، تستخدمها المعاينة والتصدير معًا —
فاللي بتشوفه في المعاينة هو بالظبط اللي بيتصدّر للعبة.
"""
from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field

from character import Base, stylize, face_vertex_colors, flatten_chest
from expression import FaceRig, apply_expression, open_eyes
from eyes import Eye
from hair_cards import HeadShape, build as hair_build, build_fringe, build_scalp
from garments import BodyRig, build as garment_build
from blender_util import (mesh_from_arrays, simple_material, assign,
                          set_vertex_colors, vcol_skin_material, hair_material)


@dataclass
class Look:
    """مواصفة إطلالة كاملة — كل اللي بيحدد شكل الشخصية في لقطة واحدة."""
    skin: str = '#C2854F'
    lip: str = '#C4665F'
    brow: str = '#231107'
    hair_color: tuple[float, float, float] = (0.085, 0.048, 0.033)
    iris: tuple[float, float, float] = (0.175, 0.092, 0.042)
    hair: str = 'long_wavy'
    fringe: str = 'side'
    expression: str = 'smile'
    eye_open: float = 0.30
    blush: float = 1.0
    freckles: float = 0.0
    garments: dict[str, tuple[str, tuple[float, float, float]]] = field(default_factory=dict)
    """{'top': ('tee', (r,g,b)), 'bottom': ('jeans', rgb), 'dress': …, 'shoes': …}"""


# مواد القماش حسب نوع القطعة — الخامة بتفرق زي اللون بالظبط
FABRIC = {
    'sweater':      dict(rough=0.92, sheen=0.55),
    'hoodie':       dict(rough=0.90, sheen=0.45),
    'hoodie_dress': dict(rough=0.90, sheen=0.45),
    'cardigan':     dict(rough=0.92, sheen=0.50),
    'jeans':        dict(rough=0.82, sheen=0.10),
    'wide_pants':   dict(rough=0.80, sheen=0.12),
    'joggers':      dict(rough=0.88, sheen=0.30),
    'party_dress':  dict(rough=0.42, sheen=0.30),
    'gown':         dict(rough=0.38, sheen=0.35),
    'blouse':       dict(rough=0.55, sheen=0.25),
    'sneakers':     dict(rough=0.62, sheen=0.10),
    'boots':        dict(rough=0.45, sheen=0.08),
    'boots_tall':   dict(rough=0.45, sheen=0.08),
    'flats':        dict(rough=0.50, sheen=0.10),
}
FABRIC_DEFAULT = dict(rough=0.74, sheen=0.20)


def cloth_material(name: str, color, garment: str):
    cfg = FABRIC.get(garment, FABRIC_DEFAULT)
    mat = simple_material(name, color, rough=cfg['rough'])
    b = mat.node_tree.nodes['Principled BSDF']
    if 'Sheen Weight' in b.inputs:
        b.inputs['Sheen Weight'].default_value = cfg['sheen']
        b.inputs['Sheen Roughness'].default_value = 0.4
    b.inputs['Specular IOR Level'].default_value = 0.28
    return mat


def build_character(look: Look, base: Base | None = None):
    """يبني الشخصية كاملة في المشهد الحالي ويرجّع معالمها."""
    base = base or Base()
    sv = stylize(base, base.verts)
    sv = flatten_chest(base, sv)

    rig = FaceRig(base, sv)
    eye_idx = np.array(sorted({i for g in ('helper-l-eye', 'helper-r-eye')
                               for f in base.mesh.group_faces(g) for i in f}), dtype=int)
    sv = open_eyes(rig, sv, look.eye_open, exclude=eye_idx)
    rig = FaceRig(base, sv)
    if look.expression != 'neutral':
        sv = apply_expression(rig, sv, look.expression)
        rig = FaceRig(base, sv)

    def grp(*names):
        faces = base.mesh.group_faces(*names)
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        return sv[used], [tuple(remap[i] for i in f) for f in faces], np.array(used)

    # ---- الجسم ----
    bv, bf, _ = grp('body')
    body = mesh_from_arrays('body', bv, bf, subsurf=1)
    cols = face_vertex_colors(rig, bv, look.skin, look.lip,
                              blush=look.blush, brow_hex=look.brow,
                              freckles=look.freckles)
    set_vertex_colors(body, cols)
    assign(body, vcol_skin_material('skin'))

    # ---- العيون ----
    for side in ('l', 'r'):
        hv, _, _ = grp(f'helper-{side}-eye')
        eye = Eye.from_mesh(hv, rig.J[f'{side}-upperlid'], rig.J[f'{side}-lowerlid'])
        assign(mesh_from_arrays(f'sclera_{side}', *eye.sclera(), subsurf=1),
               simple_material(f'scl{side}', (0.93, 0.915, 0.905), rough=0.07, clearcoat=1.0))
        assign(mesh_from_arrays(f'iris_{side}', *eye.iris(), subsurf=1),
               simple_material(f'ir{side}', look.iris, rough=0.10, clearcoat=1.0))
        assign(mesh_from_arrays(f'pupil_{side}', *eye.pupil(), subsurf=1),
               simple_material(f'pu{side}', (0.012, 0.010, 0.013), rough=0.05, clearcoat=1.0))
        assign(mesh_from_arrays(f'hl_{side}', *eye.highlight(), subsurf=1),
               simple_material(f'hl{side}', (1, 1, 1), rough=0.04,
                               emission=(1, 1, 1), emission_strength=0.55))
        lv, lf, _ = grp(f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
        if len(lv):
            assign(mesh_from_arrays(f'lash_{side}', lv, lf, subsurf=1),
                   simple_material(f'lam{side}', (0.045, 0.028, 0.020), rough=0.38))

    # ---- الملابس (قبل الشعر عشان الشعر ينسدل فوقها) ----
    body_rig = BodyRig(base, sv)
    for slot, (gname, color) in look.garments.items():
        for k, (gv, gf) in enumerate(garment_build(body_rig, gname)):
            if len(gv) == 0:
                continue
            assign(mesh_from_arrays(f'{slot}_{k}', gv, gf, subsurf=1),
                   cloth_material(f'{slot}_{k}_m', color, gname))

    # ---- الشعر ----
    if look.hair != 'none':
        hs = HeadShape(bv, rig)
        hm = hair_material('hair', look.hair_color, strand_scale=180.0,
                           strand_depth=0.0004, rough=0.28, sheen=0.6)
        sc_v, sc_f = build_scalp(hs)
        assign(mesh_from_arrays('scalp', sc_v, sc_f, subsurf=1),
               simple_material('scalpm', tuple(c * 0.55 for c in look.hair_color), rough=0.60))
        hv2, hf2 = hair_build(hs, look.hair)
        assign(mesh_from_arrays('hair', hv2, hf2, subsurf=1), hm)
        fv, ff = build_fringe(hs, look.fringe)
        if len(fv):
            assign(mesh_from_arrays('fringe', fv, ff, subsurf=1), hm)

    return dict(verts=sv, rig=rig, body_rig=body_rig, body_verts=bv)
