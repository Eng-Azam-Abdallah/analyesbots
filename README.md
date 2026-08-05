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

- المرحلة الحالية: إعداد المشروع فقط (بدون تحليل كامل أو ربط تليجرام).
- التفاصيل في [`REQUIREMENTS.md`](REQUIREMENTS.md).
