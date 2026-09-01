import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from character import Base, stylize, face_vertex_colors
from expression import FaceRig, apply_expression, open_eyes
from hair_cards import HeadShape, build as hair_build, build_fringe, build_scalp, STYLES as HAIR_STYLES
from eyes import Eye
from blender_util import (reset_scene, mesh_from_arrays, simple_material, assign,
                          studio_lighting, ortho_camera, render_png,
                          set_vertex_colors, vcol_skin_material, hair_material)

SKIN = os.environ.get('LIVI_SKIN', '#C2854F')
LIP = os.environ.get('LIVI_LIP', '#C4665F')

EXPR = os.environ.get('LIVI_EXPR', 'smile')
base = Base()
sv_all = stylize(base, base.verts)
rig = FaceRig(base, sv_all)
# مورفة دائمة: فتح العين (الشبكة المحايدة عيونها شبه مغمضة)
_eye_idx = np.array(sorted({i for g in ('helper-l-eye', 'helper-r-eye')
                                    for f in base.mesh.group_faces(g) for i in f}), dtype=int)
sv_all = open_eyes(rig, sv_all, amount=float(os.environ.get('LIVI_EYEOPEN', '0.30')),
                   exclude=_eye_idx)
rig = FaceRig(base, sv_all)
if EXPR != 'neutral':
    sv_all = apply_expression(rig, sv_all, EXPR)
    rig = FaceRig(base, sv_all)

def grp(*names):
    faces = base.mesh.group_faces(*names)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    return sv_all[used], [tuple(remap[i] for i in f) for f in faces], np.array(used)

reset_scene()

bv, bf, bidx = grp('body')
ob = mesh_from_arrays('body', bv, bf, subsurf=1)
cols = face_vertex_colors(rig, bv, SKIN, LIP, blush=1.0)
set_vertex_colors(ob, cols)
assign(ob, vcol_skin_material('skin'))

# ---- العيون: ملاءمة كرة + اتجاه نظر محسوب من فتحة الجفن ----
for side in ('l', 'r'):
    hv, _, _ = grp(f'helper-{side}-eye')
    eye = Eye.from_mesh(hv, rig.J[f'{side}-upperlid'], rig.J[f'{side}-lowerlid'])
    assign(mesh_from_arrays(f'sclera_{side}', *eye.sclera(), subsurf=1),
           simple_material(f'scl{side}', (0.93, 0.915, 0.905), rough=0.07, clearcoat=1.0))
    assign(mesh_from_arrays(f'iris_{side}', *eye.iris(), subsurf=1),
           simple_material(f'ir{side}', (0.175, 0.092, 0.042), rough=0.10, clearcoat=1.0))
    assign(mesh_from_arrays(f'pupil_{side}', *eye.pupil(), subsurf=1),
           simple_material(f'pu{side}', (0.012, 0.010, 0.013), rough=0.05, clearcoat=1.0))
    assign(mesh_from_arrays(f'hl_{side}', *eye.highlight(), subsurf=1),
           simple_material(f'hl{side}', (1.0, 1.0, 1.0), rough=0.04,
                           emission=(1.0, 1.0, 1.0), emission_strength=0.55))

# رموش من الهندسة المساعدة
for side in ('l', 'r'):
    lv, lf, _ = grp(f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
    if len(lv):
        assign(mesh_from_arrays(f'lash_{side}', lv, lf, subsurf=1),
               simple_material(f'lam{side}', (0.045, 0.028, 0.020), rough=0.38))

# ---- الشعر: بطاقات خصل ----
HSTYLE = os.environ.get('LIVI_HAIR', 'long_wavy')
FRINGE = os.environ.get('LIVI_FRINGE', 'side')
if HSTYLE != 'none':
    hs = HeadShape(bv, rig)
    HAIR_RGB = (0.085, 0.048, 0.033)
    hm = hair_material('hair', HAIR_RGB, strand_scale=180.0, strand_depth=0.0004,
                       rough=0.28, sheen=0.6)
    sv_, sf_ = build_scalp(hs)
    assign(mesh_from_arrays('scalp', sv_, sf_, subsurf=1),
           simple_material('scalpm', tuple(c * 0.55 for c in HAIR_RGB), rough=0.60))
    hv, hf, _ = hair_build(hs, HSTYLE)
    assign(mesh_from_arrays('hair_cards', hv, hf, subsurf=1), hm)
    fv, ff = build_fringe(hs, FRINGE)
    if len(fv):
        assign(mesh_from_arrays('hair_fringe', fv, ff, subsurf=1), hm)

mode = os.environ.get('LIVI_VIEW', 'bust')
if mode == 'bust':
    center = (0, -0.02, 0.905); h = 0.185
elif mode == 'face':
    center = (0, -0.02, 0.928); h = 0.115
else:
    center = (0, 0, 0.50); h = 1.08
studio_lighting(center=center, scale=h * 0.42, power=float(os.environ.get('LIVI_POW', '0.42')))
ortho_camera(center, height=h, distance=6)
render_png(sys.argv[-1], 520, 620, samples=110)
print('OK')
