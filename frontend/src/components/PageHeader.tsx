import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  description: string;
  status?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  status,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.lead}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.aside}>
        {status ? (
          <p className={styles.status} role="status" aria-live="polite">
            {status}
          </p>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
