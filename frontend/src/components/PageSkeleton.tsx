import styles from "./PageSkeleton.module.css";

export function PageSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className="srOnly">جارٍ تحميل الصفحة…</span>
      <div className={styles.header}>
        <div className={`uiSkeleton ${styles.title}`} />
        <div className={`uiSkeleton ${styles.desc}`} />
      </div>
      <div className={styles.stats}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`uiSkeleton ${styles.stat}`} />
        ))}
      </div>
      <div className={`uiSkeleton ${styles.block}`} />
      <div className={`uiSkeleton ${styles.block}`} />
    </div>
  );
}
