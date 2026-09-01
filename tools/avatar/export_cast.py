"""
تصدير بورتريهات طاقم القصة.

بورتريه لكل شخصية × تعبير. الأفاتار بيتحوّل بالمعاملات فقط، فتكلفة
شخصية جديدة = صف في `CAST` وإعادة تشغيل — مش مشروع نمذجة.
"""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

from blender_util import (reset_scene, mesh_from_arrays, simple_material, assign,
                          studio_lighting, ortho_camera, set_vertex_colors,
                          vcol_skin_material, hair_material)
from character import Base, stylize, flatten_chest, face_vertex_colors
from expression import FaceRig, apply_expression, open_eyes
from eyes import Eye
from hair_cards import HeadShape, build as hair_build, build_fringe, build_scalp
from garments import BodyRig, build as garment_build
from assemble import cloth_material
from face_shape import PRESETS
import export_layers as EX

# الشخصية = ملامح + ألوان + شعر + إطلالة ثابتة
CAST = {
    'salma': dict(face='salma', skin='#8C5730', lip='#A8484F', iris=(0.115, 0.060, 0.030),
                  hair='long_curly', fringe='side', hair_rgb=(0.040, 0.024, 0.018),
                  top=('tee', (0.86, 0.48, 0.58))),
    'nour':  dict(face='nour', skin='#E8C39E', lip='#C9736B', iris=(0.090, 0.135, 0.100),
                  hair='bob', fringe='blunt', hair_rgb=(0.190, 0.105, 0.055),
                  top=('blouse', (0.42, 0.16, 0.24))),
    'dina':  dict(face='dina', skin='#5C3520', lip='#8E3F44', iris=(0.075, 0.045, 0.028),
                  hair='shoulder', fringe='curtain', hair_rgb=(0.026, 0.018, 0.016),
                  top=('sweater', (0.36, 0.44, 0.30))),
    'yara':  dict(face='yara', skin='#D9A473', lip='#CF7466', iris=(0.070, 0.095, 0.145),
                  hair='long_straight', fringe='curtain', hair_rgb=(0.135, 0.085, 0.055),
                  top=('cardigan', (0.90, 0.72, 0.78))),
}

EXPRESSIONS = ['neutral', 'smile', 'happy', 'sad', 'surprised', 'thinking']


def build_one(base: Base, cfg: dict, expression: str):
    sv = flatten_chest(base, stylize(base, base.verts))
    rig = FaceRig(base, sv)
    eye_idx = np.array(sorted({i for g in ('helper-l-eye', 'helper-r-eye')
                               for f in base.mesh.group_faces(g) for i in f}), dtype=int)
    sv = open_eyes(rig, sv, 0.30, exclude=eye_idx)
    rig = FaceRig(base, sv)
    from face_shape import apply_face_shape
    sv = apply_face_shape(rig, sv, PRESETS[cfg['face']], eye_exclude=eye_idx)
    rig = FaceRig(base, sv)
    if expression != 'neutral':
        sv = apply_expression(rig, sv, expression)
        rig = FaceRig(base, sv)

    def grp(*names):
        faces = base.mesh.group_faces(*names)
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        return sv[used], [tuple(remap[i] for i in f) for f in faces]

    bv, bf = grp('body')
    body = mesh_from_arrays('body', bv, bf, subsurf=1)
    set_vertex_colors(body, face_vertex_colors(rig, bv, cfg['skin'], cfg['lip']))
    assign(body, vcol_skin_material('skin'))

    for side in ('l', 'r'):
        hv, _ = grp(f'helper-{side}-eye')
        eye = Eye.from_mesh(hv, rig.J[f'{side}-upperlid'], rig.J[f'{side}-lowerlid'])
        assign(mesh_from_arrays(f'scl{side}', *eye.sclera(), subsurf=1),
               simple_material(f's{side}', (0.93, 0.915, 0.905), rough=0.07, clearcoat=1.0))
        assign(mesh_from_arrays(f'ir{side}', *eye.iris(), subsurf=1),
               simple_material(f'i{side}', cfg['iris'], rough=0.10, clearcoat=1.0))
        assign(mesh_from_arrays(f'pu{side}', *eye.pupil(), subsurf=1),
               simple_material(f'p{side}', (0.012, 0.010, 0.013), rough=0.05, clearcoat=1.0))
        assign(mesh_from_arrays(f'hl{side}', *eye.highlight(), subsurf=1),
               simple_material(f'h{side}', (1, 1, 1), rough=0.04,
                               emission=(1, 1, 1), emission_strength=0.55))
        lv, lf = grp(f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
        if len(lv):
            assign(mesh_from_arrays(f'la{side}', lv, lf, subsurf=1),
                   simple_material(f'l{side}', (0.045, 0.028, 0.020), rough=0.38))

    shape, color = cfg['top']
    body_rig = BodyRig(base, sv)
    for k, (gv, gf) in enumerate(garment_build(body_rig, shape)):
        if len(gv):
            assign(mesh_from_arrays(f'g{k}', gv, gf, subsurf=1),
                   cloth_material(f'gm{k}', color, shape))

    hs = HeadShape(bv, rig)
    hm = hair_material('hair', cfg['hair_rgb'], strand_scale=180.0,
                       strand_depth=0.0004, rough=0.28, sheen=0.6)
    scv, scf = build_scalp(hs)
    assign(mesh_from_arrays('scalp', scv, scf, subsurf=1),
           simple_material('scm', tuple(c * 0.55 for c in cfg['hair_rgb']), rough=0.6))
    hv2, hf2, _ = hair_build(hs, cfg['hair'])
    assign(mesh_from_arrays('hair', hv2, hf2, subsurf=1), hm)
    fv, ff = build_fringe(hs, cfg['fringe'])
    if len(fv):
        assign(mesh_from_arrays('fringe', fv, ff, subsurf=1), hm)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--samples', type=int, default=44)
    ap.add_argument('--expressions', default=','.join(EXPRESSIONS))
    ap.add_argument('--cast', default=','.join(CAST))
    args = ap.parse_args()

    out = Path(args.out).resolve()
    ex = EX.Exporter(out, 'bust', args.samples, 88)
    base = Base()
    exprs = args.expressions.split(',')
    names = args.cast.split(',')

    t0 = time.time()
    result: dict[str, dict[str, str]] = {}
    for name in names:
        cfg = CAST[name]
        for e in exprs:
            ex._fresh_scene()
            build_one(base, cfg, e)
            src = ex._render(f'cast/{name}_{e}.webp')
            result.setdefault(name, {})[e] = src
            print(f'  cast/{name}_{e}', flush=True)

    mp = out / 'manifest.json'
    manifest = json.loads(mp.read_text(encoding='utf-8')) if mp.exists() else {}
    manifest['cast'] = result
    manifest.setdefault('views', {}).setdefault('bust', {})['size'] = list(EX.VIEWS['bust']['size'])
    mp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    n = sum(len(v) for v in result.values())
    print(f'== تم: {n} بورتريه في {time.time() - t0:.0f}ث ==', flush=True)


if __name__ == '__main__':
    main()
