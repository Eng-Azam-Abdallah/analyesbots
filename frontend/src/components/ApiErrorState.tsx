import styles from "./ApiErrorState.module.css";

type ApiErrorStateProps = {
  message: string;
  title?: string;
  details?: string;
};

export function ApiErrorState({
  message,
  title = "تعذّر تحميل البيانات",
  details,
}: ApiErrorStateProps) {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      <p className={styles.hint}>
        تأكد أن Backend يعمل على المنفذ 3001 ثم أعد المحاولة.
      </p>
      <div className={styles.actions}>
        <a className="uiButton" href=".">
          إعادة المحاولة
        </a>
      </div>
      {details ? (
        <details className={styles.details}>
          <summary>تفاصيل تقنية</summary>
          <pre>{details}</pre>
        </details>
      ) : null}
    </div>
  );
}
