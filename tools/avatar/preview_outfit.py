import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_util import reset_scene, studio_lighting, ortho_camera, render_png
from assemble import Look, build_character

reset_scene()
look = Look(
    hair=os.environ.get('LIVI_HAIR', 'long_wavy'),
    fringe=os.environ.get('LIVI_FRINGE', 'side'),
    expression=os.environ.get('LIVI_EXPR', 'smile'),
    garments={
        'top':    (os.environ.get('LIVI_TOP', 'tee'), (0.92, 0.86, 0.78)),
        'bottom': (os.environ.get('LIVI_BOT', 'jeans'), (0.30, 0.38, 0.52)),
        'shoes':  (os.environ.get('LIVI_SHOE', 'sneakers'), (0.94, 0.93, 0.90)),
    } if os.environ.get('LIVI_DRESS', '') == '' else {
        'dress': (os.environ['LIVI_DRESS'], (0.86, 0.42, 0.50)),
        'shoes': (os.environ.get('LIVI_SHOE', 'flats'), (0.86, 0.74, 0.66)),
    },
)
build_character(look)

view = os.environ.get('LIVI_VIEW', 'full')
if view == 'full':
    center, h = (0, -0.01, 0.50), 1.08
elif view == 'bust':
    center, h = (0, -0.02, 0.885), 0.22
else:
    center, h = (0, -0.02, 0.925), 0.115
studio_lighting(center=center, scale=h * 0.42, power=float(os.environ.get('LIVI_POW', '0.19')))
ortho_camera(center, height=h, distance=6)
render_png(sys.argv[-1], 460, 700 if view == 'full' else 560,
           samples=int(os.environ.get('LIVI_SAMPLES', '90')))
print('OK')
