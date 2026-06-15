"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: { total: number; real: number; new7d: number };
  creditsOutstanding: number;
  generations7d: number;
  byFeature: { feature: string; _count: number }[];
  byProvider: { provider: string; _count: number }[];
  apiCostUsd: number;
  revenue: { amount: number; payments: number };
};

type Insights = {
  windowDays: number;
  generationsByProvider: { provider: string; count: number; avgLatencyMs: number | null }[];
  generationsByFeature: { feature: string; count: number }[];
  feedbackByAction: { action: string; count: number }[];
  providerPerformance: { provider: string; positive: number; negative: number; winRate: number | null }[];
  topPoses: { key: string; count: number }[];
  topEnvironments: { key: string; count: number }[];
};

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  credits: number;
  isAnonymous: boolean;
  banned: boolean;
  lastActiveAt: string;
  _count: { generations: number; payments: number };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [modelCfg, setModelCfg] = useState<{
    default: "GEMINI" | "OPENAI";
    features: Record<string, "GEMINI" | "OPENAI" | null>;
  } | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);

  async function loadModelCfg() {
    const res = await fetch("/api/admin/model-config");
    if (res.ok) setModelCfg(await res.json());
  }

  async function setModel(scope: string, provider: "GEMINI" | "OPENAI" | null) {
    const res = await fetch("/api/admin/model-config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, provider }),
    });
    if (res.ok) setModelCfg((await res.json()).config);
    else alert("Failed: " + (await res.json()).error);
  }

  const MODEL_LABEL: Record<string, string> = { GEMINI: "Gemini (Google)", OPENAI: "ChatGPT Image 2" };

  async function loadUsers(query = "") {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
    if (res.ok) setUsers((await res.json()).users);
  }

  useEffect(() => {
    fetch("/api/admin/stats").then(async (r) => {
      if (r.ok) setStats(await r.json());
    });
    fetch("/api/admin/insights").then(async (r) => {
      if (r.ok) setInsights(await r.json());
    });
    loadUsers();
    loadModelCfg();
  }, []);

  const MODEL_LABEL_SHORT: Record<string, string> = { GEMINI: "Gemini", OPENAI: "ChatGPT Image 2", UNKNOWN: "?" };

  async function adjustCredits(id: string) {
    const input = prompt("Crédits à ajouter (négatif pour retirer) :");
    if (!input) return;
    const delta = parseInt(input, 10);
    const note = prompt("Note (ex: achat Moneroo #123) :") ?? undefined;
    const res = await fetch(`/api/admin/users/${id}/credits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delta, note }),
    });
    if (res.ok) loadUsers(q);
    else alert("Échec: " + (await res.json()).error);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Studio A6ko — Admin</h1>

      {modelCfg && (
        <section style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16, margin: "16px 0" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Modèle d’image actif</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>
            Choisissez quel modèle IA génère les images — globalement ou par page.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <strong style={{ width: 200 }}>Par défaut (toute l’app)</strong>
            <select value={modelCfg.default} onChange={(e) => setModel("default", e.target.value as "GEMINI" | "OPENAI")} style={{ padding: 6 }}>
              <option value="GEMINI">{MODEL_LABEL.GEMINI}</option>
              <option value="OPENAI">{MODEL_LABEL.OPENAI}</option>
            </select>
          </div>
          {Object.keys(modelCfg.features).map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 200, color: "#444" }}>Page : {f}</span>
              <select
                value={modelCfg.features[f] ?? ""}
                onChange={(e) => setModel(f, e.target.value === "" ? null : (e.target.value as "GEMINI" | "OPENAI"))}
                style={{ padding: 6 }}
              >
                <option value="">↳ Défaut ({MODEL_LABEL[modelCfg.default]})</option>
                <option value="GEMINI">{MODEL_LABEL.GEMINI}</option>
                <option value="OPENAI">{MODEL_LABEL.OPENAI}</option>
              </select>
            </div>
          ))}
        </section>
      )}

      {stats && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, margin: "16px 0" }}>
          <Card label="Utilisateurs" value={stats.users.total} sub={`${stats.users.real} comptes · +${stats.users.new7d}/7j`} />
          <Card label="Crédits en circulation" value={stats.creditsOutstanding} />
          <Card label="Générations (7j)" value={stats.generations7d} />
          <Card label="Coût API" value={`$${Number(stats.apiCostUsd).toFixed(2)}`} />
          <Card label="Revenu" value={`${Number(stats.revenue.amount).toLocaleString()} XOF`} sub={`${stats.revenue.payments} paiements`} />
        </section>
      )}

      {insights && (
        <section style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16, margin: "16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>🧠 Apprentissage — ce qui marche ({insights.windowDays} j)</h2>
            <a
              href="/api/admin/export-dataset"
              style={{ fontSize: 13, fontWeight: 700, background: "#111827", color: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}
            >
              ⬇ Exporter le dataset (.jsonl)
            </a>
          </div>
          <p style={{ margin: "4px 0 14px", fontSize: 13, color: "#666" }}>
            Signal positif = téléchargé / partagé / 👍 · Signal négatif = 👎. Le « taux de réussite » compare les modèles.
          </p>

          {/* Provider A/B win rates */}
          <h3 style={{ fontSize: 14, margin: "8px 0" }}>Performance par modèle (A/B)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
            {insights.providerPerformance.length === 0 && <em style={{ color: "#999", fontSize: 13 }}>Pas encore de signaux.</em>}
            {insights.providerPerformance.map((p) => (
              <div key={p.provider} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#666" }}>{MODEL_LABEL_SHORT[p.provider] ?? p.provider}</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{p.winRate === null ? "—" : `${p.winRate}%`}</div>
                <div style={{ fontSize: 12, color: "#999" }}>👍 {p.positive} · 👎 {p.negative}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <MiniList title="Volume par modèle" items={insights.generationsByProvider.map((g) => ({ key: `${MODEL_LABEL_SHORT[g.provider] ?? g.provider}${g.avgLatencyMs ? ` · ${(g.avgLatencyMs / 1000).toFixed(1)}s` : ""}`, count: g.count }))} />
            <MiniList title="Signaux utilisateurs" items={insights.feedbackByAction.map((f) => ({ key: f.action, count: f.count }))} />
            <MiniList title="Poses gagnantes" items={insights.topPoses} />
            <MiniList title="Décors gagnants" items={insights.topEnvironments} />
          </div>
        </section>
      )}

      <div style={{ margin: "16px 0" }}>
        <input
          placeholder="Rechercher (email, nom, id)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers(q)}
          style={{ padding: 8, width: 320 }}
        />
        <button onClick={() => loadUsers(q)} style={{ marginLeft: 8, padding: 8 }}>Rechercher</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th>Utilisateur</th><th>Rôle</th><th>Crédits</th><th>Gén.</th><th>Achats</th><th>Actif</th><th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{u.email ?? (u.isAnonymous ? "(anonyme)" : u.id.slice(0, 8))}<br /><small>{u.name}</small></td>
              <td>{u.role}{u.banned && " 🚫"}</td>
              <td>{u.credits}</td>
              <td>{u._count.generations}</td>
              <td>{u._count.payments}</td>
              <td>{new Date(u.lastActiveAt).toLocaleDateString()}</td>
              <td><button onClick={() => adjustCredits(u.id)}>± Crédits</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function MiniList({ title, items }: { title: string; items: { key: string; count: number }[] }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 8 }}>{title}</div>
      {items.length === 0 && <em style={{ color: "#999", fontSize: 12 }}>—</em>}
      {items.map((it) => (
        <div key={it.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
          <span style={{ color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{it.key}</span>
          <strong>{it.count}</strong>
        </div>
      ))}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#999" }}>{sub}</div>}
    </div>
  );
}
