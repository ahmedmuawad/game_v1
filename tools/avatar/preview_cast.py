import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from blender_util import (reset_scene, mesh_from_arrays, simple_material, assign,
                          studio_lighting, ortho_camera, render_png,
                          set_vertex_colors, vcol_skin_material, hair_material)
from character import Base, stylize, flatten_chest, face_vertex_colors
from expression import FaceRig, apply_expression, open_eyes
from eyes import Eye
from hair_cards import HeadShape, build as hair_build, build_fringe, build_scalp
from face_shape import PRESETS, apply_face_shape

NAME = os.environ['LIVI_CAST']
CAST_LOOK = {
    'hero':  dict(skin='#C2854F', lip='#C4665F', hair='long_wavy',  fringe='side',
                  hair_rgb=(0.085, 0.048, 0.033), iris=(0.175, 0.092, 0.042)),
    'salma': dict(skin='#8C5730', lip='#A8484F', hair='long_curly', fringe='side',
                  hair_rgb=(0.040, 0.024, 0.018), iris=(0.115, 0.060, 0.030)),
    'nour':  dict(skin='#E8C39E', lip='#C9736B', hair='bob',        fringe='blunt',
                  hair_rgb=(0.190, 0.105, 0.055), iris=(0.090, 0.135, 0.100)),
    'dina':  dict(skin='#5C3520', lip='#8E3F44', hair='shoulder',   fringe='curtain',
                  hair_rgb=(0.026, 0.018, 0.016), iris=(0.075, 0.045, 0.028)),
    'yara':  dict(skin='#D9A473', lip='#CF7466', hair='long_straight', fringe='curtain',
                  hair_rgb=(0.135, 0.085, 0.055), iris=(0.070, 0.095, 0.145)),
}
cfg = CAST_LOOK[NAME]

reset_scene()
base = Base()
sv = flatten_chest(base, stylize(base, base.verts))
rig = FaceRig(base, sv)
eye_idx = np.array(sorted({i for g in ('helper-l-eye', 'helper-r-eye')
                           for f in base.mesh.group_faces(g) for i in f}), dtype=int)
sv = open_eyes(rig, sv, 0.30, exclude=eye_idx)
rig = FaceRig(base, sv)
sv = apply_face_shape(rig, sv, PRESETS[NAME], eye_exclude=eye_idx)
rig = FaceRig(base, sv)
sv = apply_expression(rig, sv, os.environ.get('LIVI_EXPR', 'smile'))
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
    assign(mesh_from_arrays(f'scl_{side}', *eye.sclera(), subsurf=1),
           simple_material(f's{side}', (0.93, 0.915, 0.905), rough=0.07, clearcoat=1.0))
    assign(mesh_from_arrays(f'ir_{side}', *eye.iris(), subsurf=1),
           simple_material(f'i{side}', cfg['iris'], rough=0.10, clearcoat=1.0))
    assign(mesh_from_arrays(f'pu_{side}', *eye.pupil(), subsurf=1),
           simple_material(f'p{side}', (0.012, 0.010, 0.013), rough=0.05, clearcoat=1.0))
    assign(mesh_from_arrays(f'hl_{side}', *eye.highlight(), subsurf=1),
           simple_material(f'h{side}', (1, 1, 1), rough=0.04,
                           emission=(1, 1, 1), emission_strength=0.55))
    lv, lf = grp(f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
    if len(lv):
        assign(mesh_from_arrays(f'la_{side}', lv, lf, subsurf=1),
               simple_material(f'l{side}', (0.045, 0.028, 0.020), rough=0.38))

hs = HeadShape(bv, rig)
hm = hair_material('hair', cfg['hair_rgb'], strand_scale=180.0, strand_depth=0.0004,
                   rough=0.28, sheen=0.6)
scv, scf = build_scalp(hs)
assign(mesh_from_arrays('scalp', scv, scf, subsurf=1),
       simple_material('scm', tuple(c * 0.55 for c in cfg['hair_rgb']), rough=0.6))
hv2, hf2, _ = hair_build(hs, cfg['hair'])
assign(mesh_from_arrays('hair', hv2, hf2, subsurf=1), hm)
fv, ff = build_fringe(hs, cfg['fringe'])
if len(fv):
    assign(mesh_from_arrays('fringe', fv, ff, subsurf=1), hm)

center, h = (0, -0.02, 0.905), 0.215
studio_lighting(center=center, scale=h * 0.42, power=0.19)
ortho_camera(center, height=h, distance=6)
render_png(sys.argv[-1], 340, 460, samples=80)
print('OK', NAME)
