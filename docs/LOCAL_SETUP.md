# التشغيل على جهازك

> **ليه ده ضروري:** الجلسة السحابية معزولة — `dl.google.com` محجوب فيها،
> يعني **مستحيل** تنزيل Android SDK أو بناء APK من هناك، ومفيش أي مسار
> شبكي يوصل لموبايلك المتصل بالـUSB. بناء التطبيق الأصلي لازم يحصل عندك.

---

## 1. المتطلبات

| الأداة | الإصدار | ضروري لـ |
|---|---|---|
| **Node.js** | 20+ (يُفضّل 22) | اللعبة نفسها |
| **Git** | أي | جلب الكود |
| **Android Studio** | 2024+ | بناء تطبيق أندرويد |
| **JDK** | 17 أو 21 | يجي مع Android Studio |
| Xcode (ماك فقط) | 15+ | تطبيق آيفون |
| Python | 3.11 بالضبط | **اختياري** — أصول الشخصيات فقط |

> Python 3.11 تحديدًا لأن `bpy==4.2.x` مبني عليها. لو مش هتعدّل أصول
> الشخصيات، متثبّتش Python أصلًا — الصور المصدَّرة موجودة في المستودع.

---

## 2. تشغيل اللعبة في المتصفح (٣ أوامر)

```bash
git clone https://github.com/ahmedmuawad/game_v1.git
cd game_v1
git checkout claude/livi-master-platform-plx75g

npm install
npm run dev
```

افتح `http://localhost:5173`.

**للاختبار من الموبايل على نفس الواي فاي:**
```bash
npm run dev -- --host
```
هيطبع عنوانًا زي `http://192.168.1.x:5173` — افتحه من متصفح الموبايل.

---

## 3. بناء تطبيق أندرويد

### أول مرة فقط
```bash
npm install
npx cap add android
```

### كل مرة
```bash
npm run cap:android      # يبني + يزامن + يفتح Android Studio
```

من Android Studio: اختر جهازك (لازم يكون **USB debugging** مفعّلًا) واضغط ▶ Run.

### أو APK مباشرة بلا Android Studio
```bash
npm run android:apk
```
الملف: `android/app/build/outputs/apk/debug/app-debug.apk`

انقله للموبايل وثبّته (فعّل «تثبيت من مصادر غير معروفة»).

### التصحيح من الكمبيوتر
افتح في Chrome على جهازك: `chrome://inspect/#devices` — هتلاقي WebView
التطبيق وتقدر تفتح DevTools كاملة عليه.

---

## 4. بناء تطبيق آيفون (ماك فقط)

```bash
npx cap add ios
npm run cap:ios          # يفتح Xcode
```
اختر جهازك في Xcode واضغط ▶. للتشغيل على جهاز حقيقي تحتاج حساب مطوّر
(الحساب المجاني كافٍ للتجربة الشخصية).

---

## 5. أدوات التطوير

```bash
npm run dev              # خادم التطوير
npm run build            # بناء إنتاجي
npm run typecheck        # فحص الأنواع (التطبيق + الاختبارات)
npm test                 # 58 اختبار وحدة
npm run bundle           # نسخة ملف واحد للمشاركة (dist-single/livi.html)
npm run shot             # لقطات شاشة آلية (يحتاج preview شغّال)
npm run story:check      # تشغيل آلي يلعب الفصل الأول كاملًا
```

---

## 6. أصول الشخصيات (اختياري)

فقط لو هتعدّل شكل الشخصية أو تضيف أزياء.

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install "bpy==4.2.23" numpy pillow

bash tools/avatar/assets/fetch.sh    # ينزّل الشبكة الأساسية (CC0)

# معاينة سريعة
cd tools/avatar
LIVI_VIEW=full LIVI_TOP=hoodie LIVI_BOT=joggers python3 preview_outfit.py out.png

# تصدير كامل (~15 دقيقة)
cd ../.. && npm run export:avatar:full
```

**إضافة قطعة أزياء = سطر واحد** في `tools/avatar/wardrobe.py`، ثم إعادة
التصدير. التفاصيل في `tools/avatar/README.md`.

---

## 7. مواصلة العمل مع Claude محليًا

```bash
npm install -g @anthropic-ai/claude-code
cd game_v1
claude
```

على جهازك يقدر Claude يشغّل `adb` ويبني ويثبّت على الموبايل مباشرة —
وده اللي مستحيل من الجلسة السحابية.

---

## 8. أعطال شائعة

| العطل | الحل |
|---|---|
| `cap: command not found` | `npm install` الأول |
| Gradle يفشل بخطأ SDK | افتح Android Studio → SDK Manager → ثبّت API 34+ |
| شاشة بيضا في التطبيق | `npm run build` قبل `cap sync` |
| الصور مش ظاهرة | تأكد إن `public/avatar/` موجود بعد الـclone |
| الموبايل مش ظاهر في Android Studio | فعّل USB debugging + وافق على نافذة الثقة في الموبايل |
| الخط العربي بيسقط للافتراضي | خطوط Google محتاجة إنترنت أول تشغيل |

---

## 9. أين كل شيء

```
src/                 اللعبة
├── systems/         المنطق (قابل للاختبار بلا واجهة)
├── features/        الشاشات
└── content/         قراءة الأصول المولَّدة

public/
├── avatar/          227 صورة + manifest.json
└── story/           الموسم الأول (7 ملفات JSON)

tools/avatar/        خط إنتاج الشخصيات 3D
tools/qa/            لقطات، تشغيل آلي، نسخة الملف الواحد
docs/                11 مستندًا — ابدأ بـ PRODUCT_BLUEPRINT.md
```
