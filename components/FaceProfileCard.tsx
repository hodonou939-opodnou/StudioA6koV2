"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FaceCaptureModal } from "./FaceCaptureModal";

type Ref = { id: string; angle: string; url: string };

// Optional "boost face accuracy" card. Logged-in users capture their face under a
// few angles once; it persists on the account and auto-applies to every creation.
export const FaceProfileCard: React.FC<{
  isFR: boolean;
  isGuest?: boolean;
  onRequireLogin?: () => void;
}> = ({ isFR, isGuest, onRequireLogin }) => {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(() => {
    if (isGuest) {
      setLoaded(true);
      return;
    }
    fetch("/api/face")
      .then((r) => (r.ok ? r.json() : { refs: [] }))
      .then((d) => {
        setRefs(Array.isArray(d.refs) ? d.refs : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    setRefs((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/face/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  const open = () => {
    if (isGuest) {
      onRequireLogin?.();
      return;
    }
    setCapturing(true);
  };

  const hasRefs = refs.length > 0;

  return (
    <div className="rounded-3xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 via-brand-surface to-brand-surface p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-left">
          <h3 className="text-sm sm:text-base font-black text-brand-text">
            {isFR ? "📸 Améliorer la ressemblance du visage" : "📸 Boost face accuracy"}
            <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full align-middle">
              {isFR ? "Recommandé" : "Recommended"}
            </span>
          </h3>
          <p className="text-xs text-brand-text-secondary font-light mt-1 leading-relaxed max-w-md">
            {isFR
              ? "Capturez votre visage sous quelques angles une seule fois. Studio A6ko l'utilisera pour reproduire votre visage avec précision dans toutes vos créations — disponible à chaque connexion."
              : "Capture your face from a few angles once. Studio A6ko will use it to reproduce your face precisely in every creation — available on every login."}
          </p>
        </div>
        {hasRefs && (
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            ✓ {isFR ? "Visage enregistré" : "Face saved"}
          </span>
        )}
      </div>

      {/* Saved angles */}
      {hasRefs && (
        <div className="flex flex-wrap gap-3 mt-4">
          {refs.map((r) => (
            <div key={r.id} className="relative group">
              <img
                src={r.url}
                alt={r.angle}
                className="w-16 h-16 rounded-xl object-cover border border-brand-secondary/30"
              />
              <button
                onClick={() => remove(r.id)}
                aria-label="remove"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center shadow hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={open}
          className="px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
        >
          {hasRefs ? (isFR ? "Ajouter un angle" : "Add an angle") : isFR ? "Capturer mon visage" : "Capture my face"}
        </button>
        <span className="text-[11px] text-brand-text-secondary">
          {isGuest
            ? isFR
              ? "Connexion requise pour enregistrer."
              : "Sign in required to save."
            : isFR
              ? "Optionnel — vous pouvez continuer sans."
              : "Optional — you can continue without it."}
        </span>
      </div>

      {capturing && (
        <FaceCaptureModal
          isFR={isFR}
          startAngle={hasRefs ? "extra" : "front"}
          onClose={() => setCapturing(false)}
          onSaved={load}
        />
      )}
      {loaded ? null : null}
    </div>
  );
};
