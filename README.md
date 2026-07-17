# alemancenter.com — Frontend

واجهة موقع الإيمان التعليمي. تُنشر على دومين **alemancenter.com**، بينما الباك اند
منفصل على **api.alemancenter.com** (مستودع آخر).

## المكوّنات
| المجلد | الوصف |
|---|---|
| [`alemancenter-web/`](alemancenter-web/) | تطبيق React + Vite (SPA) — يُبنى إلى ملفات ثابتة تُخدَم من `httpdocs` |
| [`api-server/`](api-server/) | وسيط Node/Express — يحقن مفتاح الواجهة السري، يدير كوكي المصادقة httpOnly، يحسّن الصور. يعمل كخدمة على `127.0.0.1:8080` ويستقبل `/api/*` |
| [`deploy/`](deploy/) | سكربتات وإعدادات النشر على AlmaLinux 9 + Plesk |

## معمارية الطلب
```
المتصفح → nginx (Plesk)
   ├── /api/*  → api-server (Node) → https://api.alemancenter.com
   └── /*      → httpdocs (SPA) → index.html
```

## البناء محليًا
```bash
# الواجهة
cd alemancenter-web && pnpm install && BASE_PATH=/ PORT=3000 pnpm build   # → dist/public

# الوسيط
cd ../api-server && pnpm install && pnpm build                            # → dist/index.mjs
```

## النشر
راجع الدليل الكامل: [`deploy/README-DEPLOY.md`](deploy/README-DEPLOY.md).
النشر بأمر واحد بعد الإعداد الأولي:
```bash
cd deploy && bash build-and-package.sh        # ينتج alemancenter-web-release.tar.gz
# ثم على السيرفر: bash server-deploy.sh
```

## ⚠️ الأسرار
- ملفات `.env` **غير مرفوعة** (مُتجاهَلة في git). القوالب فقط (`*.env.example`).
- المفتاح `ALEMANCENTER_FRONTEND_API_KEY` يُضبط في `.env` على السيرفر يدويًا.
