"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaceCaptureModal } from "./FaceCaptureModal";

type Ref = { id: string; angle: string; url: string };

const RESUME_KEY = "a6ko_capture_after_login";

// Optional "boost face accuracy" card. Logged-in users capture their face under a
// few angles once; it persists on the account and auto-applies to every creation.
// onSubjectReady emits the front angle so the studio uses it AS the subject photo.
export const FaceProfileCard: React.FC<{
  isFR: boolean;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onSubjectReady?: (img: { base64: string; mimeType: string }) => void;
}> = ({ isFR, isGuest, onRequireLogin, onSubjectReady }) => {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const sentRef = useRef<string | null>(null);

  const load = useCallback(() => {
    if (isGuest) return;
    fetch("/api/face")
      .then((r) => (r.ok ? r.json() : { refs: [] }))
      .then((d) => setRefs(Array.isArray(d.refs) ? d.refs : []))
      .catch(() => {});
  }, [isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  // Continue the capture the user started before being asked to log in.
  useEffect(() => {
    if (isGuest) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(RESUME_KEY)) {
      sessionStorage.removeItem(RESUME_KEY);
      setCapturing(true);
    }
  }, [isGuest]);

  // Hand the front angle to the studio as the subject photo.
  useEffect(() => {
    if (!onSubjectReady || refs.length === 0) return;
    const front = refs.find((r) => r.angle === "front") || refs[0];
    if (sentRef.current === front.id) return;
    sentRef.current = front.id;
    fetch(front.url)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result));
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
        if (m) onSubjectReady({ base64: m[2], mimeType: m[1] || "image/jpeg" });
      })
      .catch(() => {});
  }, [refs, onSubjectReady]);

  const startCapture = () => {
    if (isGuest) {
      try {
        sessionStorage.setItem(RESUME_KEY, "1");
      } catch {}
      onRequireLogin?.();
      return;
    }
    setCapturing(true);
  };

  const restart = async () => {
    // Re-do: clear existing angles, then capture fresh.
    sentRef.current = null;
    await Promise.all(refs.map((r) => fetch(`/api/face/${r.id}`, { method: "DELETE" }).catch(() => {})));
    setRefs([]);
    setCapturing(true);
  };

  const hasRefs = refs.length > 0;

  return (
    <div className="rounded-3xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 via-brand-surface to-brand-surface p-5 sm:p-6 shadow-sm">
      <h3 className="text-sm sm:text-base font-black text-brand-text">
        {isFR ? "📸 Améliorer la ressemblance du visage" : "📸 Boost face accuracy"}
        <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full align-middle">
          {isFR ? "Recommandé" : "Recommended"}
        </span>
      </h3>

      {!hasRefs ? (
        <>
          <p className="text-xs text-brand-text-secondary font-light mt-1 leading-relaxed max-w-md">
            {isFR
              ? "Capturez votre visage en 4 angles guidés une seule fois. Studio A6ko reproduira votre visage avec précision dans toutes vos créations — disponible à chaque connexion."
              : "Capture your face from 4 guided angles once. Studio A6ko will reproduce your face precisely in every creation — available on every login."}
          </p>
          <button
            onClick={startCapture}
            className="mt-4 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
          >
            {isFR ? "Capturer mon visage" : "Capture my face"}
          </button>
          {isGuest && (
            <p className="text-[11px] text-brand-text-secondary mt-2">{isFR ? "Connexion requise." : "Sign in required."}</p>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 text-emerald-600">
            <span className="text-lg">✓</span>
            <span className="text-sm font-black">{isFR ? "Votre visage est enregistré" : "Your face is saved"}</span>
            <span className="text-[11px] text-brand-text-secondary font-medium">· {refs.length} {isFR ? "angles" : "angles"}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              onClick={() => setViewing(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-secondary/30 text-brand-text text-xs font-black uppercase tracking-wider hover:border-brand-primary/40 active:scale-[0.98] transition-all"
            >
              {isFR ? "Voir" : "View"}
            </button>
            <button
              onClick={restart}
              className="px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-secondary/30 text-brand-text text-xs font-black uppercase tracking-wider hover:border-brand-primary/40 active:scale-[0.98] transition-all"
            >
              {isFR ? "Reprendre" : "Redo"}
            </button>
          </div>
        </>
      )}

      {capturing && (
        <FaceCaptureModal isFR={isFR} onClose={() => { setCapturing(false); load(); }} onSaved={load} />
      )}

      {/* "Voir" — show saved angles in a popup */}
      {viewing && (
        <div className="fixed inset-0 z-[110] bg-brand-text/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setViewing(false)}>
          <div className="bg-brand-surface rounded-3xl shadow-2xl w-full max-w-sm border border-brand-primary/10 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-brand-text">{isFR ? "Votre visage enregistré" : "Your saved face"}</span>
              <button onClick={() => setViewing(false)} className="text-brand-text-secondary hover:text-brand-text text-xs font-bold uppercase">
                {isFR ? "Fermer" : "Close"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {refs.map((r) => (
                <img key={r.id} src={r.url} alt={r.angle} className="w-full aspect-square rounded-xl object-cover border border-brand-secondary/30" />
              ))}
            </div>
            <button
              onClick={() => { setViewing(false); restart(); }}
              className="mt-4 w-full py-3 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {isFR ? "Reprendre la capture" : "Redo capture"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
