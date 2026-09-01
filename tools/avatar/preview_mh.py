import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from objload import load_obj
from blender_util import (reset_scene, mesh_from_arrays, skin_material,
                          assign, studio_lighting, ortho_camera, render_png)

m = load_obj(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets/base.obj'))
v, f = m.extract('body')

# MakeHuman: Y لأعلى، Z للعمق. Blender: Z لأعلى، -Y للأمام.
v = np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)
v -= np.array([0.0, 0.0, v[:, 2].min()])          # القدمان على z=0
scale = 1.0 / (v[:, 2].max())                      # الطول = 1.0
v *= scale

reset_scene()
ob = mesh_from_arrays('body', v, f, subsurf=1)
assign(ob, skin_material('skin', (0.760, 0.520, 0.375)))

mode = sys.argv[1] if len(sys.argv) > 2 else 'head'
if mode == 'head':
    center = (0, 0, 0.925); height = 0.20
else:
    center = (0, 0, 0.50); height = 1.10
studio_lighting(center=center, scale=height * 0.30)
ortho_camera(center, height=height, distance=6)
render_png(sys.argv[-1], 520, 620, samples=90)
print('OK')
