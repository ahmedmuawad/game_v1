# خط إنتاج شخصيات ليڤي

توليد أصول الشخصية **3D → طبقات 2D**: نبني ونضيء الشخصية في Blender،
ونُصدّر صورًا شفافة تُركَّب في اللعبة كطبقات. الشكل مجسّم واقعي الملامح،
والتشغيل خفيف على أي هاتف (صور، لا محرك 3D لحظي).

## الأصول والترخيص

`assets/base.obj` — الشبكة البشرية الأساسية من مشروع MakeHuman،
**مُطلَقة CC0 صراحةً** (سبتمبر 2020) من Data Collection AB و Joel Palmius
و Jonas Hauquier. استخدام تجاري حر بلا نسب ولا رسوم.

## الملفات

| الملف | الدور |
|---|---|
| `objload.py` | محمّل OBJ يحافظ على المجموعات |
| `character.py` | تحميل الشبكة، التطبيع، التنميط، ألوان الرؤوس |
| `expression.py` | نظام تعابير الوجه (ابتسامة، دهشة، حزن، تفكير) |
| `hair_cards.py` | شعر ببطاقات خصل (ribbons) + فروة داكنة |
| `eyes.py` | كرة العين بملاءمة كرة + قزحية وبؤبؤ وبريق |
| `garments.py` | توليد الملابس: كتالوج 26 قطعة (علوي/سفلي/جيبات/فساتين/أحذية) |
| `meshutil.py` | ناظميات، أقنعة الأطراف، بناء القشرات، تنعيم لابلاسي |
| `assemble.py` | تجميع الشخصية الكاملة من مواصفة `Look` |
| `meshlib.py` | أدوات نمذجة برمجية بـ numpy |
| `blender_util.py` | خامات، إضاءة استوديو، كاميرا، تصيير |
| `face_texture.py` | مولّد خريطة نسيج (بديل لألوان الرؤوس) |

## قيد المنتج

الشبكة الأساسية محايدة وعارية. خط الإنتاج **لا يُصدّر أبدًا** شخصية بلا
ملابس، والنسب مُعدَّلة لتقرأ كمراهقة بأسلوب رسومي غير مُجسَّد.
انظر `docs/PRODUCT_BLUEPRINT.md` §9 و§14.

## التشغيل

```bash
pip install "bpy==4.2.23" numpy pillow
cd tools/avatar
LIVI_EXPR=smile LIVI_VIEW=face LIVI_HAIR=none python3 preview_char.py out.png
```

```bash
# شخصية كاملة بملابس
LIVI_VIEW=full LIVI_TOP=hoodie LIVI_BOT=joggers LIVI_SHOE=sneakers \
  python3 preview_outfit.py out.png

# فستان
LIVI_DRESS=sundress LIVI_HAIR=long_curly python3 preview_outfit.py out.png
```

متغيّرات البيئة: `LIVI_EXPR` (neutral/smile/happy/surprised/sad/thinking) ·
`LIVI_VIEW` (face/bust/full) · `LIVI_HAIR` · `LIVI_FRINGE` (side/blunt/curtain/none) ·
`LIVI_TOP` · `LIVI_BOT` · `LIVI_DRESS` · `LIVI_SHOE` · `LIVI_POW` (شدة الإضاءة)

## كيف تُضاف قطعة ملابس جديدة

صف واحد في `garments.CATALOG` — بلا نمذجة يدوية:

```python
'skirt_mini': dict(kind='skirt', hem=0.440, flare=1.55),
'sweater':    dict(kind='top', hem=0.568, sleeve='long', neck='crew', thickness=0.0125),
```

القطعة عبارة عن **منطقة من جلد الجسم مُزاحة للخارج** مع تنعيم لابلاسي
يخليها تنسدل بدل ما تلتصق. النتيجة إنها بتتفصّل على المقاس تلقائيًا مهما
تغيّرت نسب الشخصية — وده اللي بيخلي وتيرة نزول المحتوى ممكنة اقتصاديًا.

الاستثناء: الجيبات والفساتين المنسدلة تُبنى كسطح مُدار لأنها تبتعد عن الجسم.
