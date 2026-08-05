import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem" }}>
          الصفحة غير موجودة
        </h1>
        <p style={{ margin: "0 0 24px", color: "#4b5563" }}>
          تعذّر العثور على الصفحة المطلوبة.
        </p>
        <Link className="uiButton" href="/">
          العودة للوحة السوق
        </Link>
      </div>
    </main>
  );
}
