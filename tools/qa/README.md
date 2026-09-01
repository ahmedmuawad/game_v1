# أدوات ضبط الجودة

## لقطات الشاشة

```bash
npm run build
npx vite preview --port 4173 --host 127.0.0.1 &
npm run shot
```

يلتقط `/tmp/app_1.png` و `/tmp/app_2.png` ويطبع أخطاء الكونسول.
يستخدم Chromium المثبّت مسبقًا (`/opt/pw-browsers/chromium`) —
لا تشغّل `playwright install`.
