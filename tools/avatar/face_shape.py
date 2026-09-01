"""
تنويع ملامح الوجه.

الغرض: إثبات إن الطاقم كله (بطلة القصة + الشخصيات) ممكن يتولّد من نفس
الأساس بتغيير معاملات فقط — من غير ده، كل شخصية جديدة بتبقى مشروع نمذجة
مستقل، وطاقم القصة بيتحوّل لأكبر بند تكلفة في المشروع.

كل الأنصاف أقطار بوحدة المسافة بين العينين، فالتنويعات مستقلة عن المقياس.
"""
from __future__ import annotations
import numpy as np
from dataclasses import dataclass


@dataclass
class FaceShape:
    """مواصفة ملامح. القيمة 0 = الأساس المحايد؛ الموجب والسالب اتجاهان."""
    face_length: float = 0.0     # وجه أطول (+) أو أقصر (−)
    jaw_width: float = 0.0       # فك أعرض (+) / أضيق (−)
    chin_point: float = 0.0      # ذقن مدبب (+) / مربع (−)
    cheek_full: float = 0.0      # خدود ممتلئة (+) / نحيفة (−)
    cheekbone: float = 0.0       # عظمة خد بارزة (+)
    eye_spacing: float = 0.0     # عيون متباعدة (+) / متقاربة (−)
    eye_size: float = 0.0        # عيون أكبر (+)
    eye_tilt: float = 0.0        # ميل خارجي لأعلى (+)
    nose_size: float = 0.0       # أنف أكبر (+)
    nose_width: float = 0.0      # أنف أعرض (+)
    nose_bridge: float = 0.0     # جسر أعلى (+)
    lip_full: float = 0.0        # شفاه أكمل (+)
    mouth_width: float = 0.0     # فم أعرض (+)
    brow_height: float = 0.0     # حواجب أعلى (+)
    forehead: float = 0.0        # جبهة أبرز (+)


def apply_face_shape(rig, verts: np.ndarray, shape: FaceShape,
                     eye_exclude: np.ndarray | None = None) -> np.ndarray:
    """
    يطبّق مواصفة الملامح على الرؤوس ويرجّع نسخة معدّلة.

    `eye_exclude` = مؤشرات رؤوس كرة العين. تكبير فتحة العين لازم يكبّر
    الجلد والجفون **بدون** كرة العين — وإلا الكرة بتكبر معاهم وتبرز من
    المحجر فتطلع نظرة جاحظة. المباعدة (`eye_spacing`) بالعكس: لازم تحرّك
    الكرة مع المحجر عشان يفضلوا متطابقين.
    """
    v = verts.copy()
    u = rig.inter
    J = rig.J

    # ---- طول الوجه: تمديد رأسي من خط العين للذقن ----
    if shape.face_length:
        jaw_z = float(J['jaw'][2])
        eye_z = float(rig.eye_mid[2])
        below = v[:, 2] < eye_z
        k = 1.0 + 0.16 * shape.face_length
        v[below, 2] = eye_z - (eye_z - v[below, 2]) * k

    # ---- الفك والذقن ----
    if shape.jaw_width:
        jaw = J['jaw']
        d = np.linalg.norm((v - jaw) / np.array([u * 2.0, u * 1.7, u * 1.4]), axis=1)
        w = np.clip(1.0 - d, 0, 1) ** 1.2
        v[:, 0] += v[:, 0] * w * 0.16 * shape.jaw_width
    if shape.chin_point:
        chin = J['jaw'] + np.array([0, -u * 0.55, -u * 0.42])
        v = rig.push(v, chin, u * 0.75, (0, -0.35, -1.0), u * 0.16 * shape.chin_point, power=1.3)
        v = rig.push(v, chin + np.array([0, 0, u * 0.10]), u * 0.9, (1, 0, 0), 0.0)
        d = np.linalg.norm((v - chin) / np.array([u * 0.9, u * 0.9, u * 0.8]), axis=1)
        w = np.clip(1.0 - d, 0, 1) ** 1.2
        v[:, 0] -= v[:, 0] * w * 0.18 * max(shape.chin_point, 0)

    # ---- الخدود ----
    if shape.cheek_full:
        for side in (1, -1):
            c = rig.cheek(side) + np.array([0, 0, u * 0.20])
            v = rig.push(v, c, u * 1.15, (side * 0.55, -0.72, 0.10),
                         u * 0.20 * shape.cheek_full, power=1.25)
    if shape.cheekbone:
        for side in (1, -1):
            e = rig.eye_l if side > 0 else rig.eye_r
            c = e + np.array([side * u * 0.60, -u * 0.18, -u * 0.52])
            v = rig.push(v, c, u * 0.80, (side * 0.85, -0.50, 0.15),
                         u * 0.16 * shape.cheekbone, power=1.3)

    # ---- العيون ----
    if shape.eye_spacing:
        for side in (1, -1):
            e = rig.eye_l if side > 0 else rig.eye_r
            d = np.linalg.norm((v - e) / np.array([u * 1.05, u * 1.35, u * 0.95]), axis=1)
            w = np.clip(1.0 - d, 0, 1)
            w = w * w * (3 - 2 * w)
            v[:, 0] += side * w * u * 0.20 * shape.eye_spacing
    if shape.eye_size:
        keep = np.ones(len(v), dtype=bool)
        if eye_exclude is not None:
            keep[eye_exclude] = False
        for side in (1, -1):
            e = rig.eye_l if side > 0 else rig.eye_r
            d = np.linalg.norm((v - e) / np.array([u * 1.0, u * 1.25, u * 0.85]), axis=1)
            w = np.clip(1.0 - d, 0, 1)
            w = w * w * (3 - 2 * w)
            w = np.where(keep, w, 0.0)
            v += (v - e) * (0.14 * shape.eye_size * w)[:, None]
    if shape.eye_tilt:
        for side in (1, -1):
            e = rig.eye_l if side > 0 else rig.eye_r
            outer = e + np.array([side * u * 0.52, -u * 0.20, 0])
            v = rig.push(v, outer, u * 0.42, (0, 0, 1), u * 0.10 * shape.eye_tilt, power=1.2)
            inner = e + np.array([-side * u * 0.34, -u * 0.20, 0])
            v = rig.push(v, inner, u * 0.32, (0, 0, -1), u * 0.045 * shape.eye_tilt, power=1.2)

    # ---- الأنف ----
    nose_tip = rig.eye_mid + np.array([0, -u * 0.62, -u * 0.62])
    if shape.nose_size:
        v = rig.push(v, nose_tip, u * 0.62, (0, -1, 0), u * 0.16 * shape.nose_size, power=1.2)
    if shape.nose_width:
        d = np.linalg.norm((v - nose_tip) / np.array([u * 0.75, u * 0.65, u * 0.55]), axis=1)
        w = np.clip(1.0 - d, 0, 1) ** 1.2
        v[:, 0] += v[:, 0] * w * 0.30 * shape.nose_width
    if shape.nose_bridge:
        bridge = rig.eye_mid + np.array([0, -u * 0.52, -u * 0.05])
        v = rig.push(v, bridge, u * 0.55, (0, -1, 0), u * 0.11 * shape.nose_bridge, power=1.3)

    # ---- الفم ----
    if shape.lip_full:
        lc = rig.lip_center
        v = rig.push(v, lc + np.array([0, 0, u * 0.10]), u * 0.50,
                     (0, -1, 0.4), u * 0.075 * shape.lip_full, power=1.15)
        v = rig.push(v, lc + np.array([0, 0, -u * 0.12]), u * 0.52,
                     (0, -1, -0.35), u * 0.095 * shape.lip_full, power=1.15)
    if shape.mouth_width:
        for side in (1, -1):
            c = rig.mouth_corner(side)
            v = rig.push(v, c, u * 0.50, (side, 0, 0), u * 0.16 * shape.mouth_width, power=1.2)

    # ---- الحاجب والجبهة ----
    if shape.brow_height:
        for side in (1, -1):
            v = rig.push(v, rig.brow(side), u * 0.70, (0, 0, 1),
                         u * 0.14 * shape.brow_height, power=1.2)
    if shape.forehead:
        fore = rig.eye_mid + np.array([0, -u * 0.40, u * 1.05])
        v = rig.push(v, fore, u * 1.25, (0, -1, 0), u * 0.13 * shape.forehead, power=1.3)

    return v


# ملامح مرجعية لطاقم الموسم الأول — إثبات إن التنويع يشتغل
PRESETS: dict[str, FaceShape] = {
    'hero':   FaceShape(),                       # البطلة — الأساس المحايد
    'salma':  FaceShape(face_length=-0.55, jaw_width=0.45, cheek_full=0.70,
                        eye_size=0.35, eye_spacing=0.25, nose_width=0.30,
                        lip_full=0.55, mouth_width=0.20, brow_height=0.30),
    'nour':   FaceShape(face_length=0.60, jaw_width=-0.40, chin_point=0.65,
                        cheekbone=0.75, eye_tilt=0.60, eye_spacing=-0.20,
                        nose_size=0.30, nose_bridge=0.55, lip_full=-0.25,
                        brow_height=-0.20),
    'dina':   FaceShape(face_length=-0.20, cheek_full=-0.45, cheekbone=0.55,
                        eye_size=-0.25, eye_spacing=0.35, nose_size=-0.30,
                        nose_width=-0.25, lip_full=0.30, mouth_width=-0.20,
                        forehead=0.35),
    'yara':   FaceShape(face_length=0.25, jaw_width=0.30, chin_point=-0.40,
                        cheek_full=0.40, eye_size=0.45, eye_tilt=-0.30,
                        nose_size=0.20, nose_width=0.35, lip_full=0.65,
                        mouth_width=0.30, brow_height=0.20),
}
