"use client";

import React, { useEffect, useState } from "react";
import { authClient, signIn } from "@/lib/auth-client";
import { WHATSAPP_SUPPORT_LINK } from "../constants";

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
      if ((p as { generic?: boolean }).generic) {
        await authClient.signIn.oauth2({ providerId: p.id, callbackURL });
      } else {
        await signIn.social({ provider: p.id as "google" | "apple" | "facebook", callbackURL });
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
                    <span>{p.emoji || ""}</span>
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
                {isFR ? "Quelque chose s'est mal passé" : "Something went wrong"}
              </h2>
              <p className="text-sm text-brand-text-secondary mt-2 mb-5">
                {isFR
                  ? "Nous n'avons pas pu vérifier votre compte. Contactez le support pour de l'aide."
                  : "We couldn't verify your account. Please contact support for help."}
              </p>
            </>
          )}

          {/* WhatsApp support — always available */}
          <a
            href={WHATSAPP_SUPPORT_LINK}
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
