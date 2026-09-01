"""أدوات مساعدة لـ Blender: إنشاء الشبكات، الخامات، الإضاءة، التصيير."""
from __future__ import annotations
import bpy, math, numpy as np


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def mesh_from_arrays(name: str, verts: np.ndarray, faces: list, smooth: bool = True,
                     subsurf: int = 1):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(verbose=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if subsurf > 0:
        m = ob.modifiers.new('sub', 'SUBSURF')
        m.levels = subsurf
        m.render_levels = subsurf
    return ob


def skin_material(name: str, base=(0.86, 0.66, 0.53), rough=0.46, sss=0.16):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1.0)
    b.inputs['Roughness'].default_value = rough
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.32, 0.13, 0.09)
        if 'Subsurface Scale' in b.inputs:
            b.inputs['Subsurface Scale'].default_value = 0.06
    b.inputs['Specular IOR Level'].default_value = 0.42
    return mat


def simple_material(name: str, base, rough=0.5, metallic=0.0, emission=None,
                    emission_strength=0.0, clearcoat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metallic
    if emission is not None:
        b.inputs['Emission Color'].default_value = (*emission, 1.0)
        b.inputs['Emission Strength'].default_value = emission_strength
    if clearcoat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = clearcoat
        b.inputs['Coat Roughness'].default_value = 0.18
    return mat


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


def add_area(loc, energy, size, rot=(0, 0, 0), color=(1, 1, 1)):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    L = bpy.context.object
    L.data.energy = energy
    L.data.size = size
    L.data.color = color
    return L


def look_at(ob, target):
    """يوجّه محور -Z المحلي للكائن نحو نقطة (الطريقة القياسية في Blender)."""
    import mathutils
    d = mathutils.Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def studio_lighting(center=(0, 0, 0), scale=1.0, warm=True, power=1.0):
    """
    إضاءة ثلاثية استوديو: مفتاح دافي مائل + ملء بارد + حافة خلفية.
    دي اللي بتدي الإحساس «الاحترافي» — الشكل بيتقري من الظل مش من الخط.
    """
    cx, cy, cz = center
    key = add_area((cx - 2.2 * scale, cy - 3.0 * scale, cz + 2.4 * scale),
                   energy=520 * scale ** 2 * power, size=3.4 * scale,
                   color=(1.0, 0.955, 0.90) if warm else (1, 1, 1))
    look_at(key, center)
    fill = add_area((cx + 3.0 * scale, cy - 2.2 * scale, cz + 0.5 * scale),
                    energy=150 * scale ** 2 * power, size=4.5 * scale, color=(0.86, 0.90, 1.0))
    look_at(fill, center)
    rim = add_area((cx + 0.6 * scale, cy + 3.2 * scale, cz + 2.0 * scale),
                   energy=420 * scale ** 2 * power, size=2.2 * scale, color=(1.0, 0.86, 0.94))
    look_at(rim, center)
    # ملء علوي خفيف جدًا لتنعيم أعلى الرأس
    top = add_area((cx, cy - 0.6 * scale, cz + 4.0 * scale),
                   energy=90 * scale ** 2 * power, size=5.0 * scale, color=(0.95, 0.93, 1.0))
    look_at(top, center)
    return key, fill, rim, top


def ortho_camera(center, height, distance=8.0):
    """كاميرا متعامدة — تضمن ثبات المقياس بين كل الطبقات المُصدَّرة."""
    bpy.ops.object.camera_add(location=(center[0], center[1] - distance, center[2]),
                              rotation=(math.pi / 2, 0, 0))
    cam = bpy.context.object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = height
    bpy.context.scene.camera = cam
    return cam


def render_png(path: str, w: int, h: int, samples: int = 64, transparent: bool = True):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.compression = 60
    # Standard = ألوان متوقّعة تطابق ما نحدده في الخامات (مهم لأصول اللعبة)
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def image_from_array(name: str, arr: np.ndarray):
    """يحوّل مصفوفة numpy بأبعاد (H, W, 3) إلى صورة Blender."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, width=w, height=h, alpha=True)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = arr.astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


def set_face_uvs(ob, face_uvs: list):
    """يضبط UV لكل ركن في كل وجه (يتعامل مع التفاف الحواف بشكل صحيح)."""
    me = ob.data
    layer = me.uv_layers.new(name='UVMap')
    for poly, uvs in zip(me.polygons, face_uvs):
        for k, li in enumerate(poly.loop_indices):
            layer.data[li].uv = uvs[k]


def textured_skin_material(name: str, image, rough=0.44, sss=0.16):
    """خامة بشرة بخريطة لون + تشتت تحت السطح."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Cubic'
    tex.location = (-420, 240)
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.30, 0.12, 0.08)
        if 'Subsurface Scale' in b.inputs:
            b.inputs['Subsurface Scale'].default_value = 0.055
        nt.links.new(tex.outputs['Color'], b.inputs['Subsurface Color']) \
            if 'Subsurface Color' in b.inputs else None
    b.inputs['Specular IOR Level'].default_value = 0.40
    return mat


def hair_material(name: str, base, *, strand_scale=42.0, strand_depth=0.0016,
                  rough=0.30, sheen=0.55, tip_lighten=1.35):
    """
    خامة شعر بتفاصيل خصل إجرائية.

    قشرة ملساء بخامة لامعة بتتقري «بلاستيك» فورًا. اللي بيحوّلها لشعر هو:
    1. أخاديد خصل رفيعة (Wave texture → Bump)
    2. لمعة اتجاهية (anisotropic) مش لمعة كروية
    3. تفتيح تدريجي ناحية الأطراف
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']

    coord = nt.nodes.new('ShaderNodeTexCoord'); coord.location = (-1100, 0)

    # --- أخاديد الخصل: موجات رفيعة عمودية ---
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.location = (-880, -160)
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.wave_profile = 'SIN'
    wave.inputs['Scale'].default_value = strand_scale
    wave.inputs['Distortion'].default_value = 3.2
    wave.inputs['Detail'].default_value = 2.0
    wave.inputs['Detail Scale'].default_value = 1.4
    nt.links.new(coord.outputs['Object'], wave.inputs['Vector'])

    wave2 = nt.nodes.new('ShaderNodeTexWave'); wave2.location = (-880, -360)
    wave2.wave_type = 'BANDS'
    wave2.bands_direction = 'X'
    wave2.inputs['Scale'].default_value = strand_scale * 2.7
    wave2.inputs['Distortion'].default_value = 1.6
    nt.links.new(coord.outputs['Object'], wave2.inputs['Vector'])

    mix = nt.nodes.new('ShaderNodeMix'); mix.location = (-650, -260)
    mix.data_type = 'FLOAT'
    mix.inputs['Factor'].default_value = 0.40
    nt.links.new(wave.outputs['Fac'], mix.inputs[2])
    nt.links.new(wave2.outputs['Fac'], mix.inputs[3])

    bump = nt.nodes.new('ShaderNodeBump'); bump.location = (-430, -260)
    bump.inputs['Strength'].default_value = 0.85
    bump.inputs['Distance'].default_value = strand_depth
    nt.links.new(mix.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])

    # --- تدرّج لوني: الجذور أغمق والأطراف أفتح ---
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); sep.location = (-880, 260)
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.location = (-650, 260)
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.10
    ramp.color_ramp.elements[0].color = (*[min(c * tip_lighten, 1.0) for c in base], 1)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (*[c * 0.80 for c in base], 1)
    mapr = nt.nodes.new('ShaderNodeMapRange'); mapr.location = (-760, 120)
    mapr.inputs['From Min'].default_value = -1.5
    mapr.inputs['From Max'].default_value = 0.5
    nt.links.new(sep.outputs['Z'], mapr.inputs['Value'])
    nt.links.new(mapr.outputs['Result'], ramp.inputs['Fac'])

    # تباين خفيف بين الخصل يمنع اللون المسطّح
    tint = nt.nodes.new('ShaderNodeMix'); tint.location = (-420, 200)
    tint.data_type = 'RGBA'
    tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 0.22
    nt.links.new(ramp.outputs['Color'], tint.inputs[6])
    grey = nt.nodes.new('ShaderNodeValToRGB'); grey.location = (-650, 60)
    grey.color_ramp.elements[0].color = (0.72, 0.70, 0.70, 1)
    grey.color_ramp.elements[1].color = (1.22, 1.20, 1.18, 1)
    nt.links.new(mix.outputs[0], grey.inputs['Fac'])
    nt.links.new(grey.outputs['Color'], tint.inputs[7])
    nt.links.new(tint.outputs[2], b.inputs['Base Color'])

    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.34
    if 'Anisotropic' in b.inputs:
        b.inputs['Anisotropic'].default_value = 0.72
        b.inputs['Anisotropic Rotation'].default_value = 0.25
    if 'Sheen Weight' in b.inputs:
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.34
        b.inputs['Sheen Tint'].default_value = (*[min(c * 1.6, 1.0) for c in base], 1)
    return mat


def set_vertex_colors(ob, colors: np.ndarray, name: str = 'Col'):
    """يضبط لونًا لكل رأس (Color Attribute) — بديل مستقل عن تخطيط UV."""
    me = ob.data
    attr = me.color_attributes.new(name=name, type='FLOAT_COLOR', domain='POINT')
    rgba = np.ones((len(colors), 4), dtype=np.float32)
    rgba[:, :3] = colors.astype(np.float32)
    attr.data.foreach_set('color', rgba.ravel())
    return attr


def vcol_skin_material(name: str, attr_name: str = 'Col', rough=0.44, sss=0.17):
    """خامة بشرة تقرأ لونها من ألوان الرؤوس، مع تشتت تحت السطح."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    col = nt.nodes.new('ShaderNodeVertexColor')
    col.layer_name = attr_name
    col.location = (-380, 220)
    nt.links.new(col.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.30, 0.12, 0.08)
        if 'Subsurface Scale' in b.inputs:
            b.inputs['Subsurface Scale'].default_value = 0.012
    b.inputs['Specular IOR Level'].default_value = 0.40
    return mat
