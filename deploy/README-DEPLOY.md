# نشر واجهة alemancenter.com — Plesk Node.js (AlmaLinux 9)

موقعك يعمل كـ**تطبيق Node.js في Plesk** (Passenger):
`App Root = /httpdocs` · `Document Root = /httpdocs/public` · `Startup File = server.js`.
هذا الدليل يستبدل الموقع القديم بالجديد **بنفس البنية**.

## ما الذي نبنيه
خادم Node واحد (`server.js`) يخدم كل شيء:
- **SPA الثابت** من `public/` + fallback لتوجيه العميل.
- **`/api/*`**: حقن المفتاح السري، كوكي المصادقة httpOnly، تحسين الصور (sharp)، تمرير عكسي إلى `api.alemancenter.com`.

هيكل `/httpdocs` بعد النشر:
```
/httpdocs/
├── server.js       ← Startup File (يشغّل dist/index.mjs)
├── dist/           ← خادم Node مُجمّع (index.mjs + عمّال pino)
├── package.json    ← يحتوي sharp فقط (الباقي مُجمّع)
├── public/         ← الـSPA  (Document Root)
└── node_modules/   ← بعد "NPM install" في Plesk (يثبّت sharp)
```

---

## 1) البناء (على جهازك)
```bash
cd artifacts/deploy
bash build-plesk.sh
# → ينتج release/httpdocs/  و  httpdocs.tar.gz
```

## 2) نسخة احتياطية + إيقاف (على السيرفر / Plesk)
```bash
cp -r /var/www/vhosts/alemancenter.com/httpdocs \
      /var/www/vhosts/alemancenter.com/httpdocs.bak.$(date +%F)
```
ثم في Plesk: **Websites & Domains → alemancenter.com → Node.js → Disable Node.js**.

## 3) استبدال المحتوى (تنظيف آمن)
> آمن: الواجهة لا تحوي أي بيانات — كل المحتوى على `api.alemancenter.com`.
```bash
cd /var/www/vhosts/alemancenter.com/httpdocs
# احذف القديم مع الإبقاء على ما يخصّ SSL/النظام
find . -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' ! -name 'logs' ! -name 'tmp' -exec rm -rf {} +
```

## 4) رفع الجديد
ارفع `httpdocs.tar.gz` وفكّه داخل `/httpdocs`:
```bash
tar -xzf /tmp/httpdocs.tar.gz -C /tmp && \
cp -r /tmp/httpdocs/. /var/www/vhosts/alemancenter.com/httpdocs/
# صحّح الملكية لمستخدم النطاق
chown -R "$(stat -c '%U:%G' /var/www/vhosts/alemancenter.com)" \
      /var/www/vhosts/alemancenter.com/httpdocs
```
(أو استخدم **File Manager** في Plesk للرفع والفك.)

## 5) متغيّرات البيئة (Plesk)
Node.js → **Custom environment variables** → أضِف:
| المفتاح | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `ALEMANCENTER_FRONTEND_API_KEY` | المفتاح السري الحقيقي |
| `ALLOWED_ORIGINS` | `https://alemancenter.com,https://www.alemancenter.com` |

> Plesk يحقن `PORT` تلقائيًا — لا تضبطه يدويًا.

## 6) التثبيت والتشغيل (Plesk)
1. تأكد أن **Application Startup File = `server.js`** و **Document Root = `/httpdocs/public`**.
2. اضغط **NPM install** (يثبّت sharp).
3. اضغط **Enable Node.js** ثم **Restart App**.

## 7) التحقق
```bash
curl -I  https://alemancenter.com/            # 200 text/html
curl -s  https://alemancenter.com/api/health  # استجابة JSON
```
افتح الموقع → سجّل دخولًا (كوكي المصادقة) → افتح مقالًا (صور + تحميل).

## التراجع (Rollback)
```bash
# أعد المحتوى القديم ثم Restart App
rsync -a --delete /var/www/vhosts/alemancenter.com/httpdocs.bak.YYYY-MM-DD/ \
                  /var/www/vhosts/alemancenter.com/httpdocs/
```

---

## كل تحديث لاحق (روتين)
```bash
# محليًا
cd artifacts/deploy && bash build-plesk.sh
# ارفع httpdocs.tar.gz، فكّه فوق /httpdocs، ثم في Plesk: NPM install (إن تغيّرت الحزم) → Restart App
```

## ملاحظات
- **HTTPS إلزامي** (كوكي الدخول Secure) — أبقِ شهادة Plesk/Let's Encrypt مفعّلة.
- **الباك اند** `api.alemancenter.com` منفصل وله دورة نشر خاصة — لا يُلمس هنا.
- **الأسرار** لا تُرفع في git؛ تُضبط في Plesk «Custom environment variables».
