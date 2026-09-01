"""
خط التصدير: 3D → طبقات 2D.

يصيّر كل طبقة بنفس الكاميرا والدقة بالظبط، فالطبقات بتتركب في اللعبة
بمحاذاة بكسل مثالية. كل طبقة بتتصيّر لوحدها بخلفية شفافة.

المخرجات:
  public/avatar/<view>/<layer>.webp   — الصور
  public/avatar/manifest.json         — ترتيب الطبقات وبيانات العناصر

الاستخدام:
  python3 export_layers.py --out ../../public/avatar --preset demo
  python3 export_layers.py --out ../../public/avatar --preset full
"""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy

from blender_util import (reset_scene, mesh_from_arrays, simple_material, assign,
                          studio_lighting, ortho_camera, set_vertex_colors,
                          vcol_skin_material, hair_material)
from character import Base, stylize, flatten_chest, face_vertex_colors
from expression import FaceRig, apply_expression, open_eyes
from eyes import Eye
from hair_cards import HeadShape, build as hair_build, build_fringe, build_scalp, split_by_depth
from garments import BodyRig, build as garment_build
from assemble import cloth_material
from face_shape import FaceShape, apply_face_shape
import wardrobe as W

# ============================================================
# إعدادات العرض — لازم تفضل ثابتة عبر كل الطبقات
# ============================================================

VIEWS = {
    'full': dict(center=(0.0, -0.01, 0.50), height=1.08, size=(384, 768)),
    'bust': dict(center=(0.0, -0.02, 0.895), height=0.235, size=(384, 480)),
}

# ترتيب التركيب في اللعبة (الأصغر تحت)
LAYER_ORDER = {
    'hair_back': 0,
    'body': 10,
    'bottom': 20,
    'top': 30,
    'dress': 30,
    'shoes': 40,
    'accessory': 50,
    'hair_front': 60,
}


class Exporter:
    def __init__(self, out_dir: Path, view: str, samples: int, quality: int):
        self.out = out_dir
        self.view = view
        self.cfg = VIEWS[view]
        self.samples = samples
        self.quality = quality
        self.base = Base()
        self.manifest: dict = {}
        (self.out / view).mkdir(parents=True, exist_ok=True)

    # ---- إعداد المشهد ----
    def _fresh_scene(self):
        reset_scene()
        c = self.cfg
        studio_lighting(center=c['center'], scale=c['height'] * 0.42, power=0.19)
        ortho_camera(c['center'], height=c['height'], distance=6)

    def _render(self, rel_path: str) -> str:
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        sc.cycles.samples = self.samples
        sc.cycles.use_denoising = True
        w, h = self.cfg['size']
        sc.render.resolution_x, sc.render.resolution_y = w, h
        sc.render.resolution_percentage = 100
        sc.render.film_transparent = True
        sc.render.image_settings.file_format = 'WEBP'
        sc.render.image_settings.color_mode = 'RGBA'
        sc.render.image_settings.quality = self.quality
        sc.view_settings.view_transform = 'Standard'
        sc.view_settings.look = 'None'
        path = self.out / self.view / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        sc.render.filepath = str(path.with_suffix(''))
        bpy.ops.render.render(write_still=True)
        return f'{self.view}/{rel_path}'

    # ---- بناء الشخصية الأساسية (بلا طبقات) ----
    def _character(self, face: FaceShape | None = None, expression: str = 'smile'):
        base = self.base
        sv = flatten_chest(base, stylize(base, base.verts))
        rig = FaceRig(base, sv)
        eye_idx = np.array(sorted({i for g in ('helper-l-eye', 'helper-r-eye')
                                   for f in base.mesh.group_faces(g) for i in f}), dtype=int)
        sv = open_eyes(rig, sv, 0.30, exclude=eye_idx)
        rig = FaceRig(base, sv)
        if face is not None:
            sv = apply_face_shape(rig, sv, face, eye_exclude=eye_idx)
            rig = FaceRig(base, sv)
        if expression != 'neutral':
            sv = apply_expression(rig, sv, expression)
            rig = FaceRig(base, sv)
        return sv, rig

    def _grp(self, sv, *names):
        faces = self.base.mesh.group_faces(*names)
        used = sorted({i for f in faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        return sv[used], [tuple(remap[i] for i in f) for f in faces]

    # ---- الطبقات ----
    def export_body(self, tones: list[str], eye_colors: list[str], expression: str):
        out = {}
        for tone in tones:
            skin_hex, lip_hex, ar, en = W.SKIN_TONES[tone]
            for eye_key in eye_colors:
                iris, eye_ar, eye_en = W.EYE_COLORS[eye_key]
                self._fresh_scene()
                sv, rig = self._character(expression=expression)
                bv, bf = self._grp(sv, 'body')
                body = mesh_from_arrays('body', bv, bf, subsurf=1)
                set_vertex_colors(body, face_vertex_colors(rig, bv, skin_hex, lip_hex))
                assign(body, vcol_skin_material('skin'))
                for side in ('l', 'r'):
                    hv, _ = self._grp(sv, f'helper-{side}-eye')
                    eye = Eye.from_mesh(hv, rig.J[f'{side}-upperlid'], rig.J[f'{side}-lowerlid'])
                    assign(mesh_from_arrays(f'scl{side}', *eye.sclera(), subsurf=1),
                           simple_material(f's{side}', (0.93, 0.915, 0.905), rough=0.07, clearcoat=1.0))
                    assign(mesh_from_arrays(f'ir{side}', *eye.iris(), subsurf=1),
                           simple_material(f'i{side}', iris, rough=0.10, clearcoat=1.0))
                    assign(mesh_from_arrays(f'pu{side}', *eye.pupil(), subsurf=1),
                           simple_material(f'p{side}', (0.012, 0.010, 0.013), rough=0.05, clearcoat=1.0))
                    assign(mesh_from_arrays(f'hl{side}', *eye.highlight(), subsurf=1),
                           simple_material(f'h{side}', (1, 1, 1), rough=0.04,
                                           emission=(1, 1, 1), emission_strength=0.55))
                    lv, lf = self._grp(sv, f'helper-{side}-eyelashes-1', f'helper-{side}-eyelashes-2')
                    if len(lv):
                        assign(mesh_from_arrays(f'la{side}', lv, lf, subsurf=1),
                               simple_material(f'l{side}', (0.045, 0.028, 0.020), rough=0.38))
                key = f'{tone}_{eye_key}'
                src = self._render(f'body/{key}.webp')
                out[key] = dict(src=src, skin=tone, eyes=eye_key,
                                name={'ar': ar, 'en': en})
                print(f'  body/{key}', flush=True)
        return out

    def export_hair(self, styles: list[str], colors: list[str]):
        out = {}
        for style in styles:
            for ckey in colors:
                rgb, ar, en = W.HAIR_COLORS[ckey]
                for part in ('back', 'front'):
                    self._fresh_scene()
                    sv, rig = self._character()
                    bv, _ = self._grp(sv, 'body')
                    hs = HeadShape(bv, rig)
                    hm = hair_material('hair', rgb, strand_scale=180.0,
                                       strand_depth=0.0004, rough=0.28, sheen=0.6)
                    v, f, th = hair_build(hs, style)
                    (back_v, back_f), (front_v, front_f) = split_by_depth(v, f, th)
                    if part == 'back':
                        if len(back_v):
                            assign(mesh_from_arrays('hb', back_v, back_f, subsurf=1), hm)
                    else:
                        scv, scf = build_scalp(hs)
                        assign(mesh_from_arrays('scalp', scv, scf, subsurf=1),
                               simple_material('scm', tuple(c * 0.55 for c in rgb), rough=0.6))
                        if len(front_v):
                            assign(mesh_from_arrays('hf', front_v, front_f, subsurf=1), hm)
                        fv, ff = build_fringe(hs, 'side')
                        if len(fv):
                            assign(mesh_from_arrays('fr', fv, ff, subsurf=1), hm)
                    key = f'{style}_{ckey}'
                    src = self._render(f'hair_{part}/{key}.webp')
                    out.setdefault(key, {})[part] = src
                    out[key].update(style=style, color=ckey,
                                    name={'ar': W.HAIR_STYLES[style][0] + ' · ' + ar,
                                          'en': W.HAIR_STYLES[style][1] + ' · ' + en})
                print(f'  hair/{style}_{ckey}', flush=True)
        return out

    def export_garments(self, items: list[W.Item]):
        out = {}
        for it in items:
            self._fresh_scene()
            sv, rig = self._character()
            body_rig = BodyRig(self.base, sv)
            parts = garment_build(body_rig, it.shape)
            drawn = 0
            for k, (gv, gf) in enumerate(parts):
                if len(gv) == 0:
                    continue
                assign(mesh_from_arrays(f'g{k}', gv, gf, subsurf=1),
                       cloth_material(f'gm{k}', it.color, it.shape))
                drawn += 1
            if drawn == 0:
                print(f'  !! فارغ: {it.id}', flush=True)
                continue
            src = self._render(f'{it.category}/{it.id}.webp')
            cur, amount = W.RARITY_PRICE[it.rarity]
            out[it.id] = dict(src=src, category=it.category, rarity=it.rarity,
                              tags=it.tags, starter=it.starter, level=it.level,
                              price=None if it.starter else dict(currency=cur, amount=amount),
                              name={'ar': it.ar, 'en': it.en})
            print(f'  {it.category}/{it.id}', flush=True)
        return out


PRESETS = {
    'demo': dict(tones=['honey', 'espresso'], eyes=['brown'],
                 hair_styles=['long_wavy', 'bob'], hair_colors=['espresso', 'honey'],
                 items=['top_tee_cream', 'top_hoodie_lilac', 'bot_jeans_classic',
                        'bot_skirt_navy', 'dr_sun_butter', 'sh_sneak_white']),
    'full': dict(tones=list(W.SKIN_TONES), eyes=list(W.EYE_COLORS),
                 hair_styles=list(W.HAIR_STYLES), hair_colors=list(W.HAIR_COLORS),
                 items=[i.id for i in W.ITEMS]),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--view', default='full', choices=list(VIEWS))
    ap.add_argument('--preset', default='demo', choices=list(PRESETS))
    ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--quality', type=int, default=88)
    ap.add_argument('--expression', default='smile')
    args = ap.parse_args()

    preset = PRESETS[args.preset]
    out_dir = Path(args.out).resolve()
    ex = Exporter(out_dir, args.view, args.samples, args.quality)

    t0 = time.time()
    print(f'== تصدير [{args.preset}] · العرض [{args.view}] ==', flush=True)
    body = ex.export_body(preset['tones'], preset['eyes'], args.expression)
    hair = ex.export_hair(preset['hair_styles'], preset['hair_colors'])
    items = [W.by_id(i) for i in preset['items']]
    garments = ex.export_garments([i for i in items if i])

    manifest_path = out_dir / 'manifest.json'
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest.setdefault('views', {})
    manifest['views'][args.view] = dict(
        size=list(VIEWS[args.view]['size']),
        body=body, hair=hair, garments=garments,
    )
    manifest['layerOrder'] = LAYER_ORDER
    manifest['skinTones'] = {k: dict(name={'ar': v[2], 'en': v[3]}) for k, v in W.SKIN_TONES.items()}
    manifest['eyeColors'] = {k: dict(name={'ar': v[1], 'en': v[2]}) for k, v in W.EYE_COLORS.items()}
    manifest['hairStyles'] = {k: dict(name={'ar': v[0], 'en': v[1]}) for k, v in W.HAIR_STYLES.items()}
    manifest['hairColors'] = {k: dict(name={'ar': v[1], 'en': v[2]}) for k, v in W.HAIR_COLORS.items()}
    manifest['generatedAt'] = int(time.time())
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

    n = len(body) + len(hair) * 2 + len(garments)
    print(f'== تم: {n} طبقة في {time.time() - t0:.0f}ث → {manifest_path} ==', flush=True)


if __name__ == '__main__':
    main()
