import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styles from "./StatCards.module.css";

export type StatItem = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "up" | "down" | "fresh" | "neutral";
  icon: LucideIcon;
};

export function StatCards({ items }: { items: StatItem[] }) {
  return (
    <section className={styles.grid} aria-label="ملخص مؤشرات السوق">
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "neutral";
        const className = `${styles.card} ${styles[tone]} ${item.href ? styles.cardLink : ""}`;

        const body = (
          <>
            <div className={styles.top}>
              <span className={styles.label}>{item.label}</span>
              <Icon className={styles.icon} size={18} aria-hidden />
            </div>
            <strong className={styles.value}>{item.value}</strong>
            {item.hint ? <p className={styles.hint}>{item.hint}</p> : null}
          </>
        );

        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={className}>
              {body}
            </Link>
          );
        }

        return (
          <div key={item.key} className={className}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
