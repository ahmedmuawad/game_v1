import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from character import Base, stylize, face_vertex_colors
from expression import FaceRig, apply_expression
from hair_fit import Scalp, length as hair_length, bangs as hair_bangs, STYLES as HAIR_STYLES
from blender_util import (reset_scene, mesh_from_arrays, simple_material, assign,
                          studio_lighting, ortho_camera, render_png,
                          set_vertex_colors, vcol_skin_material, hair_material)

SKIN = '#C2854F'
LIP = '#AF5A69'

EXPR = os.environ.get('LIVI_EXPR', 'smile')
base = Base()
sv_all = stylize(base, base.verts)
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

# كرات العين من الهندسة المساعدة الأصلية — أدق من التخمين
for side, g in (('l', 'helper-l-eye'), ('r', 'helper-r-eye')):
    ev, ef, _ = grp(g)
    c = ev.mean(0)
    r = float(np.linalg.norm(ev - c, axis=1).max())
    assign(mesh_from_arrays(f'eye_{side}', ev, ef, subsurf=2),
           simple_material(f'scl{side}', (0.90, 0.885, 0.875), rough=0.08, clearcoat=0.9))
    # قزحية وبؤبؤ كأقراص مقبّبة على سطح الكرة
    for nm, rad, colr, off in (('iris', r * 0.55, (0.20, 0.11, 0.05), 0.0012),
                               ('pupil', r * 0.24, (0.015, 0.012, 0.015), 0.0026)):
        n_seg, n_ring = 36, 6
        pts = [c + np.array([0, -r - off - 0.0008, 0])]
        for ring in range(1, n_ring + 1):
            rr = rad * ring / n_ring
            d = np.sqrt(max(r * r - rr * rr, 1e-9))
            for i in range(n_seg):
                a = i / n_seg * 2 * np.pi
                pts.append(c + np.array([np.cos(a) * rr, -(d + off), np.sin(a) * rr]))
        pts = np.array(pts)
        fs = [(0, 1 + i, 1 + (i + 1) % n_seg) for i in range(n_seg)]
        for ring in range(n_ring - 1):
            b0, b1 = 1 + ring * n_seg, 1 + (ring + 1) * n_seg
            for i in range(n_seg):
                jj = (i + 1) % n_seg
                fs.append((b0 + i, b0 + jj, b1 + jj, b1 + i))
        assign(mesh_from_arrays(f'{nm}_{side}', pts, fs, subsurf=1),
               simple_material(f'{nm}{side}', colr, rough=0.11, clearcoat=1.0))

# رموش من الهندسة المساعدة
for side in ('l', 'r'):
    lv, lf, _ = grp(f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
    if len(lv):
        assign(mesh_from_arrays(f'lash_{side}', lv, lf, subsurf=1),
               simple_material(f'lam{side}', (0.045, 0.028, 0.020), rough=0.38))

# ---- الشعر ----
HSTYLE = os.environ.get('LIVI_HAIR', 'long_wavy')
if HSTYLE != 'none':
    hcfg = HAIR_STYLES[HSTYLE]
    scalp = Scalp(bv, bf, rig)
    HAIR_RGB = (0.075, 0.042, 0.030)
    hm = hair_material('hair', HAIR_RGB, strand_scale=520.0, strand_depth=0.00025)
    cv, cf = scalp.cap(volume=hcfg['volume'], bangs=hcfg['bangs'])
    assign(mesh_from_arrays('hair_cap', cv, cf, subsurf=1), hm)
    lv, lf = hair_length(scalp, hcfg['length'])
    assign(mesh_from_arrays('hair_len', lv, lf, subsurf=1), hm)
    # الغُرّة مدمجة في الفروة (hairline) — مفيش شبكة منفصلة

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
