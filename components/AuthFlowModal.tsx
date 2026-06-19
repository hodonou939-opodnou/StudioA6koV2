"use client";

import React, { useEffect, useState } from "react";
import { authClient, signIn } from "@/lib/auth-client";
import { buildSupportLink } from "../constants";

export type AuthFlowMode = "login" | "blocked" | "fallback";

type Props = {
  mode: AuthFlowMode | null;
  language: "en" | "fr";
  shortId?: string | null;
  onClose: () => void;
  onAddCredits: () => void; // open the paywall (pricing)
};

const PROVIDERS = [
  { id: "google", label: "Google", emoji: "🔵" },
  { id: "apple", label: "Apple", emoji: "" },
  { id: "facebook", label: "Facebook", emoji: "📘" },
  { id: "tiktok", label: "TikTok", emoji: "🎵", generic: true },
] as const;

// Official brand marks for the provider buttons (no emoji).
function ProviderIcon({ id }: { id: string }) {
  if (id === "google") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    );
  }
  if (id === "facebook") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07z"/>
      </svg>
    );
  }
  if (id === "apple") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.14zM14.62 4.4c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.59 3.03-1.46z"/>
      </svg>
    );
  }
  if (id === "tiktok") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.85.99 2 1.69 3.26 2.02v3.91c-1.12-.13-2.22-.55-3.17-1.19-.89-.59-1.63-1.42-2.11-2.39H16v11.83c0 2-.85 3.89-2.33 5.12-1.74 1.43-4.14 1.94-6.34 1.34-2.4-.63-4.38-2.61-4.99-5.01-.84-3.18 1.13-6.49 4.34-7.23 1.15-.27 2.37-.15 3.45.34v3.98c-.73-.39-1.58-.51-2.39-.32-1.19.27-2.07 1.33-2.12 2.56-.05 1.74 1.51 3.19 3.25 2.92 1.25-.19 2.13-1.25 2.13-2.52V.02z"/>
      </svg>
    );
  }
  return null;
}

export const AuthFlowModal: React.FC<Props> = ({ mode, language, shortId, onClose, onAddCredits }) => {
  const [enabled, setEnabled] = useState<string[]>(["google"]);
  useEffect(() => {
    fetch("/api/sso-providers")
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.providers) && d.providers.length) setEnabled(d.providers);
        }
      })
      .catch(() => {});
  }, []);

  if (!mode) return null;
  const isFR = language === "fr";

  async function loginWith(p: (typeof PROVIDERS)[number]) {
    // Remember to resume the held generation after the redirect returns.
    try {
      sessionStorage.setItem("a6ko_resume", "1");
    } catch {}
    const callbackURL = "/?resume=1";
    try {
      const errorCallbackURL = "/?auth_error=1";
      if ((p as { generic?: boolean }).generic) {
        await authClient.signIn.oauth2({ providerId: p.id, callbackURL, errorCallbackURL });
      } else {
        await signIn.social({ provider: p.id as "google" | "apple" | "facebook", callbackURL, errorCallbackURL });
      }
    } catch (e) {
      console.error("SSO failed", e);
      alert(
        isFR
          ? "La connexion a échoué. Réessayez ou contactez le support."
          : "Sign-in failed. Please try again or contact support.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-brand-text/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-brand-surface rounded-3xl shadow-2xl w-full max-w-md border border-brand-primary/10 overflow-hidden">
        <div className="p-7 text-center">
          {/* ---- LOGIN ---- */}
          {mode === "login" && (
            <>
              <img src="/icon-512.png" alt="A6ko" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4 shadow-sm" />
              <h2 className="text-xl font-black text-brand-text leading-tight">
                {isFR
                  ? "Créez un compte ou connectez-vous en un clic pour utiliser vos crédits gratuits"
                  : "Create an account or sign in in one click to use your free credits"}
              </h2>
              <p className="text-xs text-brand-text-secondary mt-2 mb-6">
                {isFR ? "Vos crédits restent liés à votre compte." : "Your credits stay tied to your account."}
              </p>
              <div className="flex flex-col gap-2.5">
                {PROVIDERS.filter((p) => enabled.includes(p.id)).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loginWith(p)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-secondary bg-brand-bg hover:bg-brand-primary hover:text-white hover:border-brand-primary text-brand-text font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    <ProviderIcon id={p.id} />
                    <span>{isFR ? `Continuer avec ${p.label}` : `Continue with ${p.label}`}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-brand-text-secondary mt-4">
                {isFR ? "En continuant, vous acceptez nos " : "By continuing you accept our "}
                <a href="/terms" className="underline">{isFR ? "Conditions" : "Terms"}</a>
                {" & "}
                <a href="/privacy" className="underline">{isFR ? "Confidentialité" : "Privacy"}</a>.
              </p>
            </>
          )}

          {/* ---- BLOCKED (scenario 1: existing account, free credits used up) ---- */}
          {mode === "blocked" && (
            <>
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">😮</div>
              <h2 className="text-xl font-black text-brand-text leading-tight">
                {isFR ? "Oups, vous avez déjà un compte" : "Oops, you already have an account"}
              </h2>
              <p className="text-sm text-brand-text-secondary mt-2 mb-1">
                {isFR
                  ? "Vous avez déjà utilisé vos crédits gratuits. Ajoutez des crédits pour continuer votre création."
                  : "You've already used your free credits. Please add credits to continue your creation."}
              </p>
              {shortId && (
                <p className="text-[11px] font-mono text-brand-primary mb-5">ID : {shortId}</p>
              )}
              <button
                onClick={onAddCredits}
                className="w-full py-3 rounded-xl bg-brand-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20 mb-2"
              >
                {isFR ? "Ajouter des crédits" : "Add credits"}
              </button>
            </>
          )}

          {/* ---- FALLBACK (scenario 4: unexpected state) ---- */}
          {mode === "fallback" && (
            <>
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🤔</div>
              <h2 className="text-xl font-black text-brand-text leading-tight">
                {isFR ? "Oups, connexion impossible" : "Oops, sign-in didn't complete"}
              </h2>
              <p className="text-sm text-brand-text-secondary mt-2 mb-5">
                {isFR
                  ? "Vous avez peut-être déjà un compte avec cet e-mail. Réessayez et choisissez le bon compte, ou contactez le support."
                  : "You may already have an account with this email. Please try again and pick the right account, or contact support."}
              </p>
            </>
          )}

          {/* WhatsApp support — always available */}
          <a
            href={buildSupportLink(shortId, isFR)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-2xl transition-all"
          >
            <span>💬</span>
            <span>{isFR ? "Besoin d'aide ? Support WhatsApp" : "Need help? WhatsApp support"}</span>
          </a>

          <div className="mt-4">
            <button onClick={onClose} className="text-brand-text-secondary hover:text-brand-text text-xs uppercase font-bold tracking-wider">
              {isFR ? "Fermer" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
