"use client";

import { authClient, signIn } from "@/lib/auth-client";

// Shown when an anonymous user clicks "Lancer"/"Generate". On success Better
// Auth links the anonymous account to the real one (credits + history carried
// over via onLinkAccount), then the caller resumes the held request.
type Props = {
  open: boolean;
  onClose: () => void;
  // where to return after the OAuth redirect — we resume the pending request there
  callbackURL?: string;
};

const PROVIDERS = [
  { id: "google", label: "Continuer avec Google" },
  { id: "apple", label: "Continuer avec Apple" },
  { id: "facebook", label: "Continuer avec Facebook" },
  { id: "tiktok", label: "Continuer avec TikTok", generic: true },
] as const;

export function LoginModal({ open, onClose, callbackURL = "/?resume=1" }: Props) {
  if (!open) return null;

  async function handle(provider: (typeof PROVIDERS)[number]) {
    if (provider.generic) {
      // TikTok via generic OAuth plugin
      await authClient.signIn.oauth2({ providerId: provider.id, callbackURL });
    } else {
      await signIn.social({ provider: provider.id as "google" | "apple" | "facebook", callbackURL });
    }
  }

  return (
    <div className="a6ko-modal-overlay" onClick={onClose}>
      <div className="a6ko-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Connectez-vous pour lancer</h2>
        <p>Vos 3 crédits offerts vous suivent sur votre compte.</p>
        <div className="a6ko-provider-list">
          {PROVIDERS.map((p) => (
            <button key={p.id} className="a6ko-provider-btn" onClick={() => handle(p)}>
              {p.label}
            </button>
          ))}
        </div>
        <button className="a6ko-modal-close" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
