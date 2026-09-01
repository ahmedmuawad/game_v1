import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from blender_util import (reset_scene, mesh_from_arrays, skin_material, simple_material,
                          assign, studio_lighting, ortho_camera, render_png,
                          image_from_array, set_face_uvs, textured_skin_material,
                          hair_material)
from meshlib import sphere_face_uvs
from face_texture import build_face_texture
import head as H
import hair as HAIR

SKIN_HEX = '#C2854F'
LIP_HEX = '#B0596A'
HAIRC = (0.055, 0.032, 0.022)
IRIS = (0.185, 0.100, 0.048)

reset_scene()
s = H.build_head()

tex = build_face_texture(SKIN_HEX, LIP_HEX, size=1024, blush=1.0)
img = image_from_array('face_tex', tex)

hv, hf = H.head_arrays(s)
ob = mesh_from_arrays('head', hv, hf, subsurf=2)
set_face_uvs(ob, sphere_face_uvs(s.nu, s.nv))
assign(ob, textured_skin_material('skin_tex', img))

SKIN_RGB = tuple(int(SKIN_HEX[i:i+2], 16) / 255 for i in (1, 3, 5))
NECK_RGB = tuple(c * 0.90 for c in SKIN_RGB)
assign(mesh_from_arrays('neck', *H.build_neck(), subsurf=2), skin_material('skin2', NECK_RGB))

for side in (1, -1):
    c = H.eye_center(s, side)
    assign(mesh_from_arrays(f'eye{side}', *H.build_eyeball(c), subsurf=1),
           simple_material(f'scl{side}', (0.88, 0.865, 0.855), rough=0.09, clearcoat=0.9))
    assign(mesh_from_arrays(f'iris{side}', *H.build_iris(c), subsurf=1),
           simple_material(f'ir{side}', IRIS, rough=0.11, clearcoat=1.0))
    assign(mesh_from_arrays(f'pup{side}', *H.build_pupil(c), subsurf=0),
           simple_material(f'pu{side}', (0.016, 0.012, 0.016), rough=0.06, clearcoat=1.0))
    for up in (True, False):
        lid = mesh_from_arrays(f'lid{side}{up}', *H.build_eyelid(c, upper=up), subsurf=1)
        assign(lid, skin_material(f'lidm{side}{up}', SKIN_RGB))
    assign(mesh_from_arrays(f'lash{side}', *H.build_lash(s, side), subsurf=1),
           simple_material(f'la{side}', HAIRC, rough=0.38))
    assign(mesh_from_arrays(f'brow{side}', *H.build_brow(s, side), subsurf=1),
           simple_material(f'br{side}', HAIRC, rough=0.55))
    assign(mesh_from_arrays(f'ear{side}', *H.build_ear(side), subsurf=2),
           skin_material(f'e{side}', SKIN_RGB))

# ---- الشعر ----
STYLE = os.environ.get('LIVI_HAIR', 'long_wavy')
cfg = HAIR.STYLES[STYLE]
HAIR_RGB = (0.090, 0.052, 0.036)
hairmat = hair_material('hair', HAIR_RGB)
cv, cf, _ = HAIR.build_cap(cfg['cap'], wave=cfg['wave'])
assign(mesh_from_arrays('hair_cap', cv, cf, subsurf=1), hairmat)
lv, lf = HAIR.build_length(cfg['cap'], length=cfg['length'], wave=cfg['wave'])
assign(mesh_from_arrays('hair_len', lv, lf, subsurf=1), hairmat)
bv, bf = HAIR.build_bangs(cfg['bangs'])
if len(bv):
    assign(mesh_from_arrays('hair_bang', bv, bf, subsurf=1), hairmat)

studio_lighting(center=(0, -0.25, -0.05), scale=0.24)
ortho_camera((0, -0.05, -0.16), height=1.85, distance=6)
out = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/head.png'
render_png(out, 520, 620, samples=100)
print('OK', out)
