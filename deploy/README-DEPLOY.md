# نشر واجهة alemancenter.com — AlmaLinux 9 + Plesk Obsidian

## البنية (مهم)
النشر **ليس ملفات ثابتة فقط**. مكوّنان:

| المكوّن | ما هو | أين يعمل |
|---|---|---|
| **SPA الثابت** | مخرجات Vite (`dist/public`) | يُخدَم من `httpdocs` عبر Apache |
| **api-server** (Node) | يحقن مفتاح الواجهة السري، يدير كوكي المصادقة httpOnly، يحسّن الصور (sharp)، يجرّد الرؤوس المزيّفة | خدمة systemd على `127.0.0.1:8080`، وnginx يمرّر لها `/api/*` |

> الـ`api-server` **إلزامي** — لا يمكن استبداله بتمرير nginx مباشر، لأنه يحمل السر ويدير الكوكيز وتحسين الصور.

```
المتصفح → nginx (Plesk)
            ├── /api/*  → 127.0.0.1:8080 (api-server Node) → https://api.alemancenter.com
            └── /*      → Apache → httpdocs (SPA) → index.html (fallback)
```

---

## الإعداد لأول مرة (مرة واحدة)

### 1) بناء وتحزيم (على جهازك)
```bash
cd artifacts/deploy
bash build-and-package.sh
# → ينتج alemancenter-web-release.tar.gz
```

### 2) رفع الحزمة للسيرفر
```bash
scp alemancenter-web-release.tar.gz root@SERVER:/tmp/
ssh root@SERVER
mkdir -p /tmp/alemancenter-release && tar -xzf /tmp/alemancenter-web-release.tar.gz -C /tmp/alemancenter-release
cd /tmp/alemancenter-release
```

### 3) ضبط متغيّرات البيئة
```bash
mkdir -p /var/www/vhosts/alemancenter.com/api-server
cp api-server/.env.example /var/www/vhosts/alemancenter.com/api-server/.env
nano /var/www/vhosts/alemancenter.com/api-server/.env   # ضع ALEMANCENTER_FRONTEND_API_KEY الحقيقي
chmod 600 /var/www/vhosts/alemancenter.com/api-server/.env
```

### 4) تثبيت خدمة systemd
```bash
# ضع اسم مستخدم النطاق في Plesk بدل REPLACE_PLESK_SYSTEM_USER
#   (Plesk → Subscriptions → alemancenter.com → System user)  أو:  stat -c '%U' /var/www/vhosts/alemancenter.com
nano alemancenter-web-api.service
cp alemancenter-web-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now alemancenter-web-api
```

### 5) توجيه nginx في Plesk
Plesk → Domains → **alemancenter.com** → **Apache & nginx Settings** →
«Additional nginx directives» → الصق محتوى `nginx-directives.conf` → OK.
(اترك **Proxy mode** مُفعّلًا.)

### 6) النشر الأول للملفات
```bash
cd /tmp/alemancenter-release
bash server-deploy.sh
```

---

## كل تحديث لاحق (روتين)
```bash
# محليًا:
cd artifacts/deploy && bash build-and-package.sh
scp alemancenter-web-release.tar.gz root@SERVER:/tmp/

# على السيرفر:
rm -rf /tmp/alemancenter-release && mkdir -p /tmp/alemancenter-release
tar -xzf /tmp/alemancenter-web-release.tar.gz -C /tmp/alemancenter-release
cd /tmp/alemancenter-release && bash server-deploy.sh
```
`server-deploy.sh` يحدّث `httpdocs` وحزمة الـapi-server، يثبّت sharp، يصلح الملكية، ويعيد تشغيل الخدمة. آمن للتكرار.

---

## التحقق بعد النشر
```bash
curl -I  https://alemancenter.com/                 # 200 + index.html
curl -s  https://alemancenter.com/api/health       # استجابة الـapi-server
systemctl status alemancenter-web-api              # active (running)
```
افتح الموقع، سجّل دخولًا (يتأكد كوكي المصادقة)، وافتح صورة (يتأكد /api/img).

## التراجع (Rollback)
- الثابت: يُحفظ نسخة سابقة في `httpdocs.bak/` — أعِدها بـrsync عند الحاجة.
- الخدمة: `systemctl restart alemancenter-web-api`.

## ملاحظات
- **الشهادة**: أبقِ Let's Encrypt في Plesk مفعّلًا للنطاق (HTTPS إلزامي — الكوكيز Secure).
- **الباك اند Go** منفصل (`api.alemancenter.com`) وله دورة نشر خاصة — هذا الدليل للواجهة فقط.
- **Node**: تأكد من توفّر Node 20+ على السيرفر (`node -v`). في Plesk يمكن تثبيته عبر إضافة Node.js أو من مستودع النظام.
