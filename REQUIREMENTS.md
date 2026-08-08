# Analyes — متطلبات وشرح النظام

> الوثيقة الرسمية لفكرة المشروع، هيكل النظام، وما تم إنجازه خطوة بخطوة.  
> المستودع: https://github.com/Eng-Azam-Abdallah/analyesbots  
> آخر تحديث: 2026-08-06

---

## 1. فكرة المشروع

**Analyes** منصة لتحليل سوق منتجات بوتات التليجرام (وبوتات البيع المرتبطة بـ APIs).

الهدف الأساسي:
- معرفة المنتجات الموجودة عند مصادر البيع.
- متابعة **التفاصيل** و**الأسعار** و**الكمية**.
- تسجيل كل تغيّر في السعر أو الكمية تلقائيًا.
- عرض نبض السوق بوضوح: **طلع / نزل / جديد / اختفى / تغيّر كمية**.

المنصة ليست متجر شراء حاليًا؛ التركيز على **التحليل والمراقبة**.

---

## 2. المشكلة التي تحلّها

- متابعة أسعار ومنتجات عدة بوتات يدويًا صعبة ومتكررة.
- لا يوجد مكان واحد يجمع المنتجات ويقارن تغيّراتها عبر الزمن.
- الحاجة لمعرفة سريعة: ماذا ارتفع؟ ماذا انخفض؟ ماذا ظهر جديدًا؟

---

## 3. أهداف صاحب المشروع (الأولوية)

1. **تفاصيل المنتجات** إن وُجدت (وصف، تعليمات تسليم، اسم، معرّف، عملة…).
2. **الأسعار** الحالية وكل أنواع السعر المتاحة من المصدر.
3. **تسجيل تغيّر السعر** إلزاميًا عند كل مزامنة (قبل/بعد + نسبة + وقت).
4. **الكمية (stock)** وحفظها وتحديثها مع تسجيل ارتفاع/انخفاض الكمية.

---

## 4. التقنيات المعتمدة

| الطبقة | التقنية |
|--------|---------|
| Runtime | Node.js |
| Backend | NestJS |
| ORM | Prisma |
| Frontend | Next.js (App Router + TypeScript) |
| Database | PostgreSQL |
| جدولة المزامنة | `@nestjs/schedule` (كل دقيقة) |
| لغة الواجهة | عربي + RTL |

Package manager: **npm**  
هيكل المشروع: مجلدان `backend/` و `frontend/` + `docker-compose.yml` لـ PostgreSQL.

---

## 5. شرح النظام (كيف يعمل)

```text
مصادر خارجية (Reseller / Canboso / ZoomStoore / TechnySoft)
        │
        ▼
 NestJS SyncOrchestrator  ── كل دقيقة ──► PostgreSQL
        │                                    │
        │ REST قراءة                         │
        ▼                                    ▼
   Next.js Frontend  ◄──────── بيانات حية ───┘
   (لوحة / منتجات / تغيّرات / بوتات)
```

### 5.1 Backend
- يتصل بمصادر المنتجات عبر API keys مخزّنة في `backend/.env` فقط (لا تُرفع إلى Git).
- `SyncOrchestrator` يشغّل مزامنة كل المصادر عند الإقلاع وكل دقيقة.
- يحفظ المنتجات، اللقطات التاريخية، وسجل التغيّرات، ونتائج المزامنة.
- يوفّر REST API للقراءة للواجهة.

### 5.2 قاعدة البيانات (Prisma)
الجداول الأساسية:
- **Bot** — مصدر بيانات (Rexovaan / Canboso / ZoomStoore / MKE TechnySoft)
- **Product** — المنتج الحالي: تفاصيل، أسعار، كمية، حالة نشط/موقوف
- **PriceSnapshot** — لقطة سعر + كمية عند أول ظهور أو عند التغيّر
- **MarketChange** — سجل التغيّرات: `up` / `down` / `new` / `gone` / `stock_up` / `stock_down`
- **BalanceSnapshot** — رصيد API إن وُجد
- **SyncRun** — نتيجة كل دورة مزامنة (نجاح/فشل)

### 5.3 Frontend
صفحات حية مربوطة بالـ API:
| المسار | الوظيفة |
|--------|---------|
| `/` | لوحة: ملخص طلع/نزل/جديد + آخر التغيّرات |
| `/products` | قائمة المنتجات (سعر + كمية) مع بحث وفلتر بوت |
| `/products/[id]` | تفاصيل المنتج + سجل السعر/الكمية |
| `/changes` | سجل التغيّرات مع فلاتر |
| `/bots` | مصادر البيانات وآخر مزامنة |

مبادئ التصميم المطبّقة:
- وضوح واتساق (قواعد قريبة من Ben Shneiderman).
- نظام مسافات 8px، أزرار/حقول ~44px، حالات Loading / Empty / Error.
- عربي كامل مع RTL.

---

## 6. مصادر البيانات الحالية

### 6.1 `@RexovaanShoppieBot` — Reseller API
- Endpoint: `.../functions/v1/reseller-api`
- يستخدم: `action=products` و `action=balance`
- سعر التحليل المرجعي: **`wholesale_price`**
- الحالة: **متصل ويعمل** (تمت مزامنة منتجات حقيقية بنجاح)
- خارج النطاق حاليًا: `action=order` (الشراء)

### 6.2 `Canboso` — Buyer API
- Docs: https://canboso.com/api/swagger
- يستخدم: `GET /api/v2/telegram-buyer/products` و `GET /api/v2/telegram-buyer/balance`
- Auth: `Authorization: Bearer` (`CANBOSO_API_KEY`)
- الحالة: **الربط في الكود جاهز** (مفتاح محدّث)، لكن المزامنة تفشل من بيئة التطوير الحالية بسبب **مهلة اتصال** إلى `canboso.com:443` (DNS يُحل إلى `157.10.44.46` لكن المنفذ غير قابل للوصول من هذه الشبكة)
- خارج النطاق حاليًا: `POST .../purchase`

> مفاتيح الـ API تُحفظ في `.env` فقط. إن ظهرت في محادثة أو لوج، يُفضّل إعادة توليدها.

### 6.3 `ZoomStoore` — Zoom Store API
- Docs: https://docs.zooomstoore.online
- Base: `https://api.zooomstoore.online/api/v1`
- Auth: `X-API-Key`
- يستخدم: `GET /products` و `GET /balance`
- الحقول: `id`, `name`, `price`, `list_price`, `stock`, `in_stock`, `currency`
- الحالة: **متصل ويعمل**
- خارج النطاق حاليًا: `POST /purchase`
- Rate limit: 20 طلب/دقيقة

### 6.4 `@mkeshopbot` — TechnySoft / MKE API
- Docs: https://api.technysoft.com/docs
- Base: `https://api.technysoft.com`
- Auth: `X-API-Key` (`TECHNYSOFT_API_KEY`)
- يستخدم: `GET /v1/products` و `GET /v1/me` (الرصيد)
- الحقول: `name_ar`/`name_en`, `price_usd`, `stock` (أو unlimited), `activation_url`
- سعر التحليل المرجعي: **`price_usd`** (عملة USD)
- الحالة: **متصل ويعمل**
- خارج النطاق حاليًا: `POST /v1/buy`

### 6.5 `TelegramBuyer` — Buyer API
- Docs: http://15.235.133.206:55033/api/swagger
- Base: `http://15.235.133.206:55033`
- Auth: `Authorization: Bearer` (`TELEGRAM_BUYER_API_KEY`)
- يستخدم: `GET /api/telegram-buyer/products` و `GET /api/telegram-buyer/balance`
- الحقول: `product_id`, `name`, `price`, `stock`, `description`, `bulk_tiers`
- الحالة: **متصل ويعمل**
- خارج النطاق حاليًا: `POST /api/telegram-buyer/purchase`

### 6.6 `HyleHub` — HyperVin Reseller API
- Docs: https://hypervin.xyz/apidocs
- Base: `https://hypervin.xyz`
- Auth: `X-API-Key` (`HYPERVIN_API_KEY`)
- يستخدم: `GET /api/products` و `POST /api/wallet/balance`
- الحقول: `id`, `name`, `price` (VND), `group`, `stock`, `format`
- الحالة: **الربط في الكود جاهز**؛ المزامنة تفشل حاليًا لأن `hypervin.xyz` يعيد **NXDOMAIN** من DNS العامة (النطاق غير منشور/غير مكتمل). يمكن تجاوز ذلك بـ `HYPERVIN_API_IP` إن وفّر المتجر عنوان IP.
- خارج النطاق حاليًا: `POST /api/orders` و `POST /api/wallet/topup`

### 6.7 `KokoroShop` — ShopDigital / KOKORO SHOP API
- Docs: https://api.shopdigital.app/docs
- Base: `https://api.shopdigital.app`
- Auth: `Authorization: Bearer` (`SHOPDIGITAL_API_KEY`)
- يستخدم: `GET /api/products` و `GET /api/balance`
- الحقول: `id`, `name`, `price`, `stock`, `bulk_discounts`, `description_es`/`description_en`
- العملة: **USDT**
- الحالة: **متصل ويعمل**
- خارج النطاق حاليًا: `POST /api/purchase`

### 6.8 `TeleShopBot` — Gemini Links Shop API
- Docs: https://teleshopbot.com/gemini-18months-links-shop/public-api-docs?botId=6a0f0aaae2a8b6c3616d1a8b
- Base: `https://teleshopbot.com/api/gemini-18months-links-shop/bots/6a0f0aaae2a8b6c3616d1a8b/v1`
- Auth: `X-API-Key` (`TELESHOPBOT_API_KEY`)
- يستخدم: `GET /products` و `GET /account/balance` (+ `account/info`)
- الحقول: `id`, `name`/`names`, `price`, `stock`, `inStock`, `category`, `description`
- الحالة: **متصل ويعمل**
- خارج النطاق حاليًا: `POST /orders`

---

## 7. REST API الداخلي (Backend :3001)

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/health` | فحص صحة السيرفر |
| GET | `/bots` | قائمة المصادر |
| GET | `/products` | قائمة المنتجات |
| GET | `/products/:id` | تفاصيل منتج |
| GET | `/products/:id/history` | سجل السعر/الكمية |
| GET | `/changes` | سجل التغيّرات |
| GET | `/market/summary` | ملخص طلع/نزل/جديد |
| GET | `/sync/runs` | نتائج المزامنة |
| POST | `/sync/run` | تشغيل مزامنة يدوية لكل المصادر |

Frontend يستخدم: `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## 8. هيكل المجلدات

```text
analyes/
├── backend/                 # NestJS + Prisma
│   ├── prisma/              # schema + migrations
│   └── src/
│       ├── reseller/        # مصدر Rexovaan
│       ├── canboso/         # مصدر Canboso
│       ├── zoomstoore/      # مصدر Zoom Store
│       ├── technysoft/      # مصدر MKE / @mkeshopbot
│       ├── telegrambuyer/   # مصدر Buyer API
│       ├── hypervin/        # مصدر HyleHub / HyperVin
│       ├── shopdigital/     # مصدر KOKORO SHOP
│       ├── teleshopbot/     # مصدر TeleShopBot Gemini
│       ├── sync/            # Orchestrator + /sync endpoints
│       ├── products/
│       ├── changes/
│       ├── market/
│       ├── bots/
│       └── health/
├── frontend/                # Next.js
│   └── src/
│       ├── app/(dashboard)/ # الصفحات
│       ├── components/
│       └── lib/             # api.ts + types + format
├── docker-compose.yml
├── README.md
└── REQUIREMENTS.md          # هذا الملف
```

---

## 9. سجل التقدم خطوة بخطوة

| # | الخطوة | الحالة | ماذا تم |
|---|--------|--------|---------|
| 1 | توثيق الفكرة والمتطلبات | تم | إنشاء هذا الملف كمرجع دائم لما يريده صاحب المشروع |
| 2 | اختيار التقنيات | تم | Node.js + NestJS + Next.js + PostgreSQL + Prisma |
| 3 | Setup المشروع | تم | `backend/` و `frontend/` و Docker Compose و README وتشغيل محلي |
| 4 | Schema أولي | تم | Bot / Product / PriceSnapshot ثم توسيعها لاحقًا |
| 5 | واجهات مبدئية Mock | تم | لوحة، منتجات، تغيّرات، بوتات ببيانات وهمية |
| 6 | تحسين UX أولي | تم | إعادة تصميم وفق وضوح/اتساق (اتجاه Shneiderman) |
| 7 | ربط Reseller API | تم | مزامنة كل دقيقة + حفظ تفاصيل/أسعار/كمية + MarketChange |
| 8 | REST قراءة للمنصة | تم | products / changes / bots / summary / sync |
| 9 | ربط الواجهة بالبيانات الحية | تم | حذف Mock وربط Next.js بـ NestJS |
| 10 | صفحة تفاصيل المنتج | تم | `/products/[id]` مع سجل التاريخ |
| 11 | Design System عملي | تم | مسافات 8، Skeleton، Empty، Error، أزرار موحّدة |
| 12 | إضافة مصدر Canboso | تم (كود) | موديول جاهز؛ المزامنة تفشل من الجهاز بسبب timeout لـ canboso.com |
| 13 | رفع المشروع إلى GitHub | تم | https://github.com/Eng-Azam-Abdallah/analyesbots |
| 14 | إضافة مصدر Zoom Store | تم | مزامنة ناجحة (~48 منتجًا) عبر `X-API-Key` بدون purchase |
| 15 | إضافة مصدر TechnySoft / @mkeshopbot | تم | مزامنة ناجحة (~26 منتجًا) عبر `GET /v1/products` + `/v1/me` بدون buy |
| 16 | إضافة مصدر Telegram Buyer API | تم | مزامنة ناجحة (~15 منتجًا) عبر Bearer بدون purchase |
| 17 | إضافة مصدر HyleHub / HyperVin | تم (كود) | موديول جاهز؛ DNS لـ hypervin.xyz غير متاح من الجهاز حاليًا |
| 18 | إضافة مصدر ShopDigital / KOKORO | تم | مزامنة ناجحة عبر Bearer (`/api/products` + `/api/balance`) بدون purchase |
| 19 | إضافة مصدر TeleShopBot Gemini | تم | مزامنة ناجحة عبر `X-API-Key` بدون orders |
| 20 | مصادر إضافية (Qamify / InsightX / Ai-Market / Vexoran / EM Store) | تم | موديولات sync + هوية البوت في الواجهة |
| 21 | ذكاء السوق — فئات + مبيعات مستنتجة/معلنة | تم | انظر [`MARKET_INTELLIGENCE.md`](./MARKET_INTELLIGENCE.md) |
| 22 | صفحة متجر التاجر `/bots/[username]` | تم | كتالوج كامل لكل مصدر مع ملخص أسعار ومخزون |

---

## 10. ما تم إنجازه الآن (ملخص الحالة)

### يعمل فعليًا
- Backend مع مزامنة عدة مصادر (Rexovaan، Zoom، TechnySoft، Telegram Buyer، ShopDigital، TeleShopBot، Qamify، …).
- Frontend يعرض بيانات حية من PostgreSQL عبر NestJS.
- تسجيل التغيّرات وتتبّع الأسعار والكميات.
- صفحة بوتات تعرض المصادر وآخر مزامنة ونشاط اليوم.
- **ذكاء السوق:** تصنيق عائلات المنتجات، `/categories`، `/analytics`، مبيعات مستنتجة من `stock_down` + معلنة من `sold_total` (Qamify)، يوم الإحصاء `Asia/Riyadh`.

### جاهز في الكود لكن لم تكتمل المزامنة بعد
- Canboso: المصدر موجود، لكن الاتصال بـ `canboso.com` يفشل (timeout) من بيئة التطوير الحالية.
- HyleHub / HyperVin: المصدر موجود، لكن `hypervin.xyz` قد لا يُحلّ عبر DNS من بعض الشبكات.

### خارج النطاق الحالي (لاحقًا)
- تنفيذ عمليات الشراء (`order` / `purchase`).
- تنبيهات عند تغيّر السعر (تليجرام/إيميل).
- نظام مستخدمين وصلاحيات.
- واجهة ثنائية اللغة (إنجليزي).
- تحديث لحظي عبر WebSocket (المزامنة كل دقيقة كافية حاليًا).
- UI لتحرير قواعد تصنيف العائلات يدويًا.

---

## 11. المراحل التالية المقترحة

1. حل وصول الشبكة إلى Canboso / HyperVin والتحقق من أول مزامنة ناجحة.
2. تنبيهات اختيارية عند طلع/نزل أو انخفاض مخزون كبير.
3. Auth بسيط للوحة إن أصبحت عامة.
4. توسيع المبيعات المعلنة لمصادر أخرى إن ظهر حقل مشابه لـ `sold_total`.

---

## 12. قرارات مثبتة

| التاريخ | القرار |
|---------|--------|
| 2026-08-05 | المشروع: منصة تحليل سوق بوتات التليجرام باسم Analyes |
| 2026-08-05 | Stack: Node.js + NestJS + Next.js + PostgreSQL + Prisma |
| 2026-08-05 | Frontend عربي + RTL |
| 2026-08-05 | المزامنة كل دقيقة عبر Nest Schedule |
| 2026-08-05 | حفظ التفاصيل + الأسعار + الكمية + سجل التغيّر في DB |
| 2026-08-05 | سعر تحليل Rexovaan المرجعي: `wholesale_price` |
| 2026-08-05 | لا شراء عبر API في هذه المرحلة (تحليل فقط) |
| 2026-08-05 | المفاتيح السرية في `.env` فقط — لا تُرفع إلى Git |
| 2026-08-05 | الواجهة مربوطة بالـ API الحقيقي (ليست Mock) |
| 2026-08-05 | المستودع: Eng-Azam-Abdallah/analyesbots |
| 2026-08-06 | المبيعات الافتراضية: مستنتجة من انخفاض المخزون؛ المعلنة عمود منفصل |
| 2026-08-06 | ترتيب البوتات الافتراضي: `revenue_proxy`؛ يوم الإحصاء `Asia/Riyadh`؛ `gone` ليس بيعًا |

---

## 13. ملخص لصاحب المشروع

> Analyes تجمع منتجات مصادر البيع، تحفظ التفاصيل والأسعار والكميات في PostgreSQL، تسجّل كل تغيّر تلقائيًا كل دقيقة، وتعرض نبض السوق والفئات والمبيعات المستنتجة في واجهة عربية حية.

---

*هذا الملف يُحدَّث مع كل مرحلة إنجاز جديدة.*
