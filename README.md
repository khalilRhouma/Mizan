# ميزان (Mizan)
### نظام تتبع المالية الشخصية

**[English](README.en.md)** | العربية

**ميزان** — تطبيق ويب ثنائي اللغة (عربي / إنجليزي) لتتبع المالية الشخصية: تسجيل المعاملات، الميزانيات الشهرية، لوحات تحليلية، وعرض سنوي على شكل جدول. تُخزَّن البيانات في **PostgreSQL** عبر واجهة **FastAPI**.

مستوحى من جدول مصروفات منزلي تونسي شخصي.

## لقطات الشاشة

### لوحة التحكم

![لوحة التحكم — التحليلات والنظرة العامة](screenshots/dashboard.png)

### الإحصائيات الشهرية

![الإحصائيات الشهرية والميزانيات](screenshots/monthly-stats.png)

### سجل المعاملات

![قائمة سجل المعاملات](screenshots/logs.png)

### إدخال معاملة

![إضافة معاملة](screenshots/log-entry.png)

## الإضافة السريعة

في صفحة التسجيل، اكتب مصروفاً واحداً في كل سطر، أو الصق ملاحظة الهاتف كاملة:

```
3/11
بنزين 60
خبز وحليب 4,2
netflix 12.99€
أمس
صيدلية 18
```

اضغط **Enter** (أو **قراءة**). كل سطر يصبح مسودة يمكنك تعديلها، ثم **احفظ** الكل.
سطر فيه تاريخ فقط ينطبق على الأسطر التي تحته. `€` تعني بطاقة/يورو. التطبيق يتعلم
"كلمة ← فئة" عند كل حفظ؛ افتح **الكلمات المحفوظة** لحذف الكلمات الخاطئة.

## التقنيات

| الطبقة | التقنية |
|---|---|
| الواجهة | React 19، Vite، Tailwind CSS، Recharts |
| الخادم | Python 3.12، FastAPI، SQLAlchemy |
| قاعدة البيانات | PostgreSQL 16 |
| النشر | Docker Compose |

## البدء السريع (Docker)

**المتطلبات:** [Docker](https://docs.docker.com/get-docker/) و [Docker Compose](https://docs.docker.com/compose/)

```bash
# 1. نسخ ملف البيئة
cp .env.example .env

# 2. تشغيل قاعدة البيانات + API
npm run docker:up

# 3. تثبيت الواجهة وتشغيل خادم التطوير
npm install
npm run dev
```

افتح [http://localhost:5173](http://localhost:5173). خادم Vite يوجّه `/api` إلى الـ API على المنفذ 8000.

### أوامر Docker

| الأمر | الوصف |
|---|---|
| `npm run docker:up` | تشغيل PostgreSQL + API (في الخلفية) |
| `npm run docker:down` | إيقاف الحاويات وحذفها |
| `npm run docker:logs` | متابعة سجلات الـ API |
| `npm run docker:full` | بناء وتشغيل DB + API + الواجهة للإنتاج (منفذ 8080) |

**الفرق بين `docker:up` و `docker:full`:** `npm run docker:up` (مثل `docker compose up -d`) يشغّل **PostgreSQL + API فقط**. شغّل الواجهة بـ `npm run dev` على المنفذ 5173. استخدم `npm run docker:full` لتشغيل كل شيء داخل Docker—بما في ذلك نسخة إنتاج من الواجهة عبر nginx على المنفذ **8080** (يعيد بناء الصور بـ `--build`).

وثائق الـ API (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

## تطوير الخادم محلياً (Python)

**Python:** 3.12 (انظر `.python-version` و `backend/requirements.txt`)

```bash
# إنشاء بيئة افتراضية (موصى به)
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# تشغيل Postgres فقط
docker compose up -d db

# تشغيل API مع إعادة التحميل التلقائي
uvicorn app.main:app --reload --port 8000
```

أو باستخدام conda:

```bash
conda create -n finance-system python=3.12 -y
conda activate finance-system
pip install -r backend/requirements.txt
```

> **تعارض المنفذ 5432:** إذا كان لديك Postgres محلي (مثل Homebrew) فهو يجيب على `localhost:5432` قبل Docker. أوقفه، أو ضع `POSTGRES_PORT=5433` في `.env` واستعمل هذا المنفذ في `DATABASE_URL`.

### ترحيل قاعدة البيانات (Alembic)

يُدار هيكل قاعدة البيانات بـ [Alembic](https://alembic.sqlalchemy.org/). الـ API يشغّل `alembic upgrade head` عند كل تشغيل (`backend/app/migrate.py`)، فيكفي `docker compose up`. قاعدة البيانات القديمة بدون سجل ترحيل تُكتشف وتُحدَّث تلقائياً.

لتغيير الهيكل:

```bash
cd backend
# 1. عدّل app/models.py
# 2. أنشئ ملف ترحيل، ثم اقرأه وصحّحه قبل الـ commit
.venv/bin/alembic revision --autogenerate -m "وصف قصير"
# 3. طبّقه (أو أعد تشغيل الـ API)
.venv/bin/alembic upgrade head
```

المبالغ المالية من نوع `NUMERIC(12, 3)` (وليس float). خذ نسخة احتياطية قبل أي ترحيل كبير: `docker exec finance-backup /backup.sh`.

### الاختبارات

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

الاختبارات تشغّل Postgres مؤقتاً في Docker (testcontainers)، لذا يجب أن يعمل Docker. لا تلمس قاعدة بياناتك الحقيقية أبداً. فحوصات الواجهة: `npm run lint` و `node --test src/lib/*.test.mjs`.

## هيكل المشروع

```
finance-system/
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/           # كود الـ API (categories.py = قائمة الفئات)
│   ├── alembic/       # ملفات ترحيل قاعدة البيانات
│   └── tests/         # اختبارات pytest
├── scripts/           # seed_demo.py (بيانات وهمية للعرض)
├── src/               # واجهة React
├── docker-compose.yml
├── Dockerfile.web     # واجهة الإنتاج (nginx)
└── spec.md            # مواصفات المنتج
```

## النسخ الاحتياطي

خدمة `backup` (تعمل مع `npm run docker:up`) تشغّل `pg_dump` كل يوم عند منتصف الليل
(توقيت تونس) وتحفظ ملفات gzip في المجلد `./backups/` على جهازك.
تحتفظ بـ 7 نسخ يومية و4 أسبوعية و6 شهرية. المجلد `backups/` مستثنى من git.

**أخذ نسخة الآن**

```bash
docker exec finance-backup /backup.sh
```

**استرجاع نسخة** (يستبدل البيانات الحالية في قاعدة `finance`)

```bash
gunzip -c backups/last/finance-latest.sql.gz | docker exec -i finance-db psql -U finance -d finance -v ON_ERROR_STOP=1
```

للرجوع أبعد في الزمن، استعمل ملفاً من `daily/` أو `weekly/` أو `monthly/`.
إذا غيّرت `POSTGRES_USER` أو `POSTGRES_DB` في `.env`، استعمل قيمك بدل `finance`.

> نصيحة: انسخ المجلد `backups/` إلى مجلد سحابي أو قرص خارجي من حين لآخر.

## متغيرات البيئة

انظر [`.env.example`](.env.example) لكل الخيارات.

| المتغير | الافتراضي | الغرض |
|---|---|---|
| `POSTGRES_USER` | `finance` | مستخدم قاعدة البيانات |
| `POSTGRES_PASSWORD` | `finance` | كلمة مرور قاعدة البيانات |
| `API_PORT` | `8000` | منفذ الـ API على الجهاز |
| `VITE_API_URL` | `/api` (بروكسي التطوير) | عنوان واجهة الـ API للواجهة الأمامية |

## الترخيص

MIT — انظر [LICENSE](LICENSE).
