# النشر التلقائي (GitHub Actions → السيرفر)

كل `git push` إلى فرع `main` يبني الواجهة والخادم على Linux نظيف ثم ينشرهما
تلقائيًا إلى `/var/www/vhosts/alemancenter.com/httpdocs` — **بلا رفع يدوي**.

الـworkflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

## الإعداد لمرة واحدة

### 1) مفتاح SSH للنشر (على جهازك)
```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy"
# ينتج: deploy_key (خاص) و deploy_key.pub (عام)
```

### 2) امنح المفتاح العام صلاحية الدخول (على السيرفر)
في Plesk: **alemancenter.com → Web Hosting Access** → فعّل **SSH access** لمستخدم النطاق
(اختر شِلّ مثل `/bin/bash`). ثم أضِف المفتاح العام:
```bash
# على السيرفر، كمستخدم النطاق (أو root ثم صحّح الملكية):
mkdir -p /var/www/vhosts/alemancenter.com/.ssh
cat deploy_key.pub >> /var/www/vhosts/alemancenter.com/.ssh/authorized_keys
chmod 700 /var/www/vhosts/alemancenter.com/.ssh
chmod 600 /var/www/vhosts/alemancenter.com/.ssh/authorized_keys
chown -R <domain-user>:<domain-group> /var/www/vhosts/alemancenter.com/.ssh
```

### 3) أضِف الأسرار في GitHub
المستودع → **Settings → Secrets and variables → Actions → New repository secret**:
| الاسم | القيمة |
|---|---|
| `DEPLOY_HOST` | `152.53.208.71` (أو دومين السيرفر) |
| `DEPLOY_USER` | مستخدم النطاق في Plesk (`stat -c '%U' /var/www/vhosts/alemancenter.com`) |
| `DEPLOY_SSH_KEY` | محتوى ملف `deploy_key` **كاملًا** (الخاص) |
| `DEPLOY_PORT` | `22` (اختياري — احذفه إن كان 22) |

> **ملاحظة**: متغيّرات البيئة (المفتاح السري `ALEMANCENTER_FRONTEND_API_KEY` وغيره) تبقى في
> **Plesk → Custom environment variables** — لا تُرفع في المستودع ولا يحتاجها البناء.

## الاستخدام
```bash
# أي تعديل:
git add -A && git commit -m "..." && git push
# → GitHub Actions يبني وينشر تلقائيًا. تابع التقدّم في تبويب Actions.
```

## ماذا يفعل الـworkflow
1. يبني الواجهة (`BASE_PATH=/`) على Linux → **لا خطأ `/Program Files/Git/`**.
2. يبني خادم Node.
3. يجمّع `public/ + dist/ + server.js + package.json`.
4. `rsync` إلى `httpdocs` (يستبدل `public` و`dist`، ويُبقي `node_modules`/`tmp`/`.well-known`).
5. `npm install` (لـsharp إن تغيّر) + `touch tmp/restart.txt` (يعيد تشغيل Passenger).

## التحقق
بعد اكتمال الـworkflow (أخضر في تبويب Actions):
```bash
curl -I https://alemancenter.com/
curl -s https://alemancenter.com/ads.txt
```

## النشر اليدوي (احتياطي)
ما زال متاحًا عبر [`build-plesk.sh`](build-plesk.sh) إن احتجته.
