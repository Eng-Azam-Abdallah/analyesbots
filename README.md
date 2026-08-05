# Analyes — منصة تحليل سوق بوتات التليجرام

منصة لتحليل منتجات بوتات البيع على التليجرام ومتابعة تغيّرات السوق.

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Runtime | Node.js |
| Backend | NestJS + Prisma |
| Frontend | Next.js (App Router + TypeScript) |
| Database | PostgreSQL 16 (Docker) أو PostgreSQL المحلي |

## المتطلبات

- Node.js 20+
- npm
- PostgreSQL (عبر Docker Desktop أو تثبيت محلي على المنفذ 5432)

## التشغيل السريع

### 1) قاعدة البيانات

باستخدام Docker:

```bash
docker compose up -d
```

أو باستخدام PostgreSQL محلي: أنشئ مستخدم وقاعدة باسم `analyes` / كلمة المرور `analyes` كما في `.env.example`.

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

API يعمل على: `http://localhost:3001`  
فحص الصحة: `GET http://localhost:3001/health`

ضع في `backend/.env`:
- `RESELLER_API_URL` / `RESELLER_API_KEY` (Rexovaan)
- `CANBOSO_API_URL` / `CANBOSO_API_KEY` (Canboso)
- `ZOOMSTOORE_API_URL` / `ZOOMSTOORE_API_KEY` (Zoom Store)
- `TECHNYSOFT_API_URL` / `TECHNYSOFT_API_KEY` (MKE / @mkeshopbot)
- `TELEGRAM_BUYER_API_URL` / `TELEGRAM_BUYER_API_KEY` (Buyer API)
- `HYPERVIN_API_URL` / `HYPERVIN_API_KEY` (HyleHub / HyperVin)
- `SHOPDIGITAL_API_URL` / `SHOPDIGITAL_API_KEY` (KOKORO SHOP)
- `TELESHOPBOT_API_URL` / `TELESHOPBOT_API_KEY` (TeleShopBot Gemini)
- أسماء البوتات: `RESELLER_BOT_USERNAME` / `CANBOSO_BOT_USERNAME` / `ZOOMSTOORE_BOT_USERNAME` / `TECHNYSOFT_BOT_USERNAME` / `TELEGRAM_BUYER_BOT_USERNAME` / `HYPERVIN_BOT_USERNAME` / `SHOPDIGITAL_BOT_USERNAME` / `TELESHOPBOT_BOT_USERNAME`

Endpoints مفيدة:
- `GET /products` — قائمة المنتجات (سعر + كمية)
- `GET /products/:id` — تفاصيل المنتج
- `GET /products/:id/history` — سجل السعر/الكمية
- `GET /changes` — سجل التغيّرات
- `GET /market/summary` — ملخص طلع/نزل/جديد
- `GET /bots` — مصادر البيانات
- `GET /sync/runs` — نتائج المزامنة
- `POST /sync/run` — مزامنة يدوية

المزامنة تعمل تلقائيًا كل دقيقة عند تشغيل الـ Backend.

### 3) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

الواجهة على: `http://localhost:3000`

## هيكل المشروع

```text
analyes/
├── backend/           # NestJS API
├── frontend/          # Next.js
├── docker-compose.yml # PostgreSQL
├── REQUIREMENTS.md
└── README.md
```

## ملاحظات

- المصادر الحالية: `@RexovaanShoppieBot` و `ZoomStoore` و `@mkeshopbot` و `TelegramBuyer` و `KokoroShop` و `TeleShopBot` يعملون؛ و `Canboso` / `HyleHub` (ربط جاهز / شبكة أو DNS غير متاح من الجهاز).
- الواجهة الأمامية تعرض البيانات الحية من NestJS API.
- التفاصيل في [`REQUIREMENTS.md`](REQUIREMENTS.md).
