import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.brand}>Analyes</p>
        <h1 className={styles.title}>منصة تحليل سوق بوتات التليجرام</h1>
        <p className={styles.subtitle}>
          المشروع جاهز للتشغيل. الواجهات التحليلية ستُبنى في المرحلة التالية.
        </p>
      </main>
    </div>
  );
}
