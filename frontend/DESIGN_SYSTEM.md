# Analyes Design System

نظام تصميم واجهة Analyes — لوحة تحليل سوق عربية RTL.

## Brand colors

| Token | Value | Usage |
|-------|-------|--------|
| `--brand-primary` | `#f97316` | أزرار أساسية، تنقّل نشط، روابط، تركيز |
| `--brand-white` | `#ffffff` | أسطح المحتوى، الجداول، الحقول |
| `--brand-ink` | `#111827` | الشريط الجانبي، العناوين، النص الأساسي |
| `--brand-muted` | `#4b5563` | نص ثانوي، بيانات وصفية |
| `--brand-soft` | `#fef3c7` | تمييز خفيف، تنبيهات حداثة البيانات |

Derived:

- `--primary-hover: #ea580c`
- `--primary-active: #c2410c`
- `--primary-soft: rgba(249, 115, 22, 0.10)`
- `--border / --border-strong`
- `--surface-muted / --surface-page`

لا يُستخدم البرتقالي كخلفية لمناطق واسعة من اللوحة.

## Semantic colors

| Meaning | Color | Wash |
|---------|-------|------|
| ارتفاع سعر/كمية | `#15803d` | `#dcfce7` |
| انخفاض سعر/كمية | `#b91c1c` | `#fee2e2` |
| منتج جديد | `#c2410c` | `#ffedd5` |
| اختفى | `#4b5563` | `#f3f4f6` |
| تحذير / مزامنة متأخرة | `#b45309` | `#fef3c7` |
| فشل | `#b91c1c` | `#fee2e2` |

الحالة تُعرض دائمًا بنص + أيقونة، وليس باللون وحده.

## Typography

- Font: **Cairo** via `next/font/google` (`--font-cairo`)
- Page title: ~28–32px / 700
- Section title: ~20px / 700
- Card title: ~17px / 600–700
- Body: ~15–16px / 400–500
- Metadata: 13–14px
- Labels: 12–13px / 600
- Line height: 1.5–1.75
- Numbers: `font-variant-numeric: tabular-nums` (class `.tabular`)

## Spacing

8px scale (+ 4px): `4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64`

Page padding:

- Mobile: 16px
- Tablet: 24px
- Desktop: 32px

## Radius & shadows

- Cards: 12–16px (`--radius`, `--radius-lg`)
- Inputs/buttons: 10–12px (`--radius-sm`)
- Shadows: soft (`--shadow-sm`, `--shadow-md`) — borders preferred for separation

## Component variants

Buttons (global classes):

- `.uiButton` — primary
- `.uiButtonSecondary` — secondary
- `.uiButtonGhost` — ghost
- `.uiButtonDanger` — danger

Badges (`StatusBadge` / `ChangeBadge`):

- Change: `up | down | new | gone | stock_up | stock_down`
- Status: `active | paused | inactive | stale | error`

## Change-status meanings (Arabic)

| Kind | Label |
|------|-------|
| `up` | ارتفع |
| `down` | انخفض |
| `new` | منتج جديد |
| `gone` | اختفى |
| `stock_up` | زادت الكمية |
| `stock_down` | انخفضت الكمية |

## RTL rules

- `html[dir=rtl]` globally
- Prefer logical properties (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start`)
- Sidebar on the inline-start edge (right in RTL)
- Use `dir="ltr"` / `.ltr` for IDs, usernames, URLs, technical codes
- Before → After ordering uses Arabic reading flow with clear labels

## Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `< 768px` | Drawer navigation, card product rows, compact filters |
| `768px+` | Expanded filter grids |
| `900px+` | Desktop tables for changes/products |
| `1024px+` | Persistent sidebar |
| `1200px+` | Six-column metric grid |

## Shell

- Sticky dark sidebar (`#111827`) with Analyes mark + navigation
- Compact top header with sync freshness chip
- Main content max-width `--max` (1280px)

## Tone of voice

Direct Arabic: clear, concise, professional.

Example: `ارتفع السعر بنسبة 8.4%` · `آخر مزامنة قبل دقيقتين` · `لا توجد تغيّرات مطابقة للفلاتر`
