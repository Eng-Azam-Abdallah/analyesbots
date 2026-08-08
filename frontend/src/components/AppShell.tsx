"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  Menu,
  Package,
  Radio,
  Tags,
  BarChart3,
  X,
} from "lucide-react";
import styles from "./AppShell.module.css";

const links = [
  { href: "/", label: "لوحة السوق", icon: LayoutDashboard },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/categories", label: "الفئات", icon: Tags },
  { href: "/analytics", label: "التحليل", icon: BarChart3 },
  { href: "/changes", label: "التغيّرات", icon: Activity },
  { href: "/bots", label: "المصادر", icon: Radio },
] as const;

export type ShellHealth = {
  connected: number;
  total: number;
  lastSyncLabel: string;
  tone: "ok" | "warn" | "bad";
};

type AppShellProps = {
  children: React.ReactNode;
  health?: ShellHealth;
};

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/products/")) return "تفاصيل المنتج";
  if (pathname.startsWith("/products")) return "المنتجات";
  if (pathname.startsWith("/categories/")) return "تفاصيل الفئة";
  if (pathname.startsWith("/categories")) return "الفئات";
  if (pathname.startsWith("/analytics")) return "التحليل";
  if (pathname.startsWith("/changes")) return "التغيّرات";
  if (pathname.match(/^\/bots\/[^/]+/)) return "متجر التاجر";
  if (pathname.startsWith("/bots")) return "المصادر";
  return "لوحة السوق";
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={styles.nav} aria-label="التنقل الرئيسي">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon className={styles.navIcon} size={18} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandBlock() {
  return (
    <Link href="/" className={styles.brand} aria-label="Analyes — الصفحة الرئيسية">
      <span className={styles.brandMark} aria-hidden>
        A
      </span>
      <span className={styles.brandText}>
        <span className={styles.brandName}>Analyes</span>
        <p className={styles.brandDesc}>
          راقب السوق، افهم التغيّر، واتخذ القرار بسرعة.
        </p>
      </span>
    </Link>
  );
}

function HealthFooter({ health }: { health?: ShellHealth }) {
  if (!health) return null;

  const toneClass =
    health.tone === "ok"
      ? styles.healthOk
      : health.tone === "warn"
        ? styles.healthWarn
        : styles.healthBad;

  return (
    <div className={styles.sidebarFoot}>
      <p className={styles.footTitle}>حالة المصادر</p>
      <div className={styles.healthRow}>
        <span>متصلة</span>
        <strong className={toneClass}>
          {health.connected}/{health.total}
        </strong>
      </div>
      <div className={styles.healthRow}>
        <span>آخر مزامنة</span>
        <strong className={`tabular ${toneClass}`}>
          {health.lastSyncLabel}
        </strong>
      </div>
    </div>
  );
}

export function AppShell({ children, health }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = pageTitle(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const chipClass =
    health?.tone === "ok"
      ? styles.syncChipOk
      : health?.tone === "bad"
        ? styles.syncChipBad
        : styles.syncChipWarn;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="القائمة الجانبية">
        <BrandBlock />
        <NavLinks pathname={pathname} />
        <HealthFooter health={health} />
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topHeader}>
          <div className={styles.headerStart}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="فتح القائمة"
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} aria-hidden />
            </button>
            <p className={styles.headerTitle}>{title}</p>
          </div>

          {health ? (
            <p
              className={`${styles.syncChip} ${chipClass}`}
              role="status"
              aria-live="polite"
            >
              آخر مزامنة {health.lastSyncLabel}
            </p>
          ) : null}
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className={styles.overlay}
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
          >
            <div className={styles.drawerHeader}>
              <BrandBlock />
              <button
                type="button"
                className={styles.closeButton}
                aria-label="إغلاق القائمة"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <HealthFooter health={health} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
