"use client";

// Route error boundary — turns any unexpected client/render crash into a clear,
// branded message instead of a blank white page.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 24px",
        background: "#FFF8F0",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#111827",
      }}
    >
      <img src="/icon-512.png" alt="A6ko" width={56} height={56} style={{ borderRadius: 16, marginBottom: 20 }} />
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px" }}>Oups, un souci est survenu</h1>
      <p style={{ maxWidth: 420, color: "#4B5563", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
        Quelque chose s&apos;est mal passé. Réessayez — vos crédits et vos créations sont en sécurité.
        <br />
        <span style={{ fontSize: 13, opacity: 0.8 }}>Something went wrong. Please retry — your credits and creations are safe.</span>
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          style={{ background: "#16A34A", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, padding: "12px 22px", cursor: "pointer", fontSize: 13 }}
        >
          Réessayer / Retry
        </button>
        <a
          href="/"
          style={{ background: "#fff", color: "#111827", fontWeight: 700, border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 22px", textDecoration: "none", fontSize: 13 }}
        >
          Accueil / Home
        </a>
      </div>
    </main>
  );
}
