"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  isFR: boolean;
  startAngle?: "front" | "left" | "right" | "extra";
  onClose: () => void;
  onSaved: () => void;
};

const FULL_STEPS = [
  { angle: "front", fr: "Regardez droit devant 🙂", en: "Look straight ahead 🙂" },
  { angle: "left", fr: "Tournez doucement la tête à gauche ⬅️", en: "Turn your head slightly left ⬅️" },
  { angle: "right", fr: "Tournez doucement la tête à droite ➡️", en: "Turn your head slightly right ➡️" },
] as const;

// Guided multi-angle face capture: wide live preview + hands-free countdown
// auto-capture (so you can hold the left/right pose). Photo-upload fallback when
// the live camera is blocked (some in-app browsers).
export const FaceCaptureModal: React.FC<Props> = ({ isFR, startAngle, onClose, onSaved }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // "extra" = adding a single bonus angle; otherwise run the 3-step guided flow.
  const steps = startAngle === "extra" ? [{ angle: "extra", fr: "Cadrez votre visage", en: "Frame your face" }] : FULL_STEPS;
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState(false);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const step = steps[stepIdx];

  // Start the camera once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch {
        setCamError(true);
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Hands-free countdown → auto-capture, restarted for each step.
  useEffect(() => {
    if (!ready || camError || busy) return;
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          clearInterval(iv);
          void captureFromVideo();
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stepIdx, camError]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function saveBase64(base64: string) {
    setBusy(true);
    setCountdown(null);
    try {
      const res = await fetch("/api/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, angle: step.angle }),
      });
      if (res.status === 401) {
        alert(isFR ? "Connectez-vous d'abord pour enregistrer votre visage." : "Please sign in first to save your face.");
        return;
      }
      if (res.status === 409) {
        alert(isFR ? "Maximum d'angles atteint. Supprimez-en un d'abord." : "Max angles reached. Remove one first.");
        stopCamera();
        onClose();
        return;
      }
      if (!res.ok) throw new Error("save failed");
      onSaved();
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      if (stepIdx < steps.length - 1) {
        setStepIdx(stepIdx + 1);
      } else {
        stopCamera();
        onClose();
      }
    } catch {
      alert(isFR ? "Échec de l'enregistrement. Réessayez." : "Save failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function captureFromVideo() {
    const v = videoRef.current;
    if (!v || busy || !v.videoWidth) return;
    // Capture the full wide frame (capped to 1024 on the long side) — not a tight crop.
    const scale = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    await saveBase64(canvas.toDataURL("image/jpeg", 0.92));
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveBase64(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[110] bg-brand-text/70 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-brand-surface rounded-3xl shadow-2xl w-full max-w-lg border border-brand-primary/10 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
              {isFR ? "Capture du visage" : "Face capture"} · {stepIdx + 1}/{steps.length}
            </span>
            <button onClick={() => { stopCamera(); onClose(); }} className="text-brand-text-secondary hover:text-brand-text text-xs font-bold uppercase">
              {isFR ? "Fermer" : "Close"}
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-black text-brand-text mb-3 text-center">{isFR ? step.fr : step.en}</h3>

          <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-brand-bg mb-4 border border-brand-secondary/30">
            {!camError ? (
              <>
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                {/* Soft oval guide (wide) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[68%] h-[82%] rounded-[50%] border-2 border-white/70" />
                </div>
                {/* Countdown */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-7xl font-black drop-shadow-lg animate-pulse">{countdown}</span>
                  </div>
                )}
                {flash && <div className="absolute inset-0 bg-white/80 animate-pulse" />}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-xs text-brand-text-secondary">
                  {isFR ? "Caméra indisponible. Importez une photo nette de votre visage." : "Camera unavailable. Upload a clear photo of your face."}
                </p>
              </div>
            )}
          </div>

          {!camError ? (
            <button
              onClick={() => { setCountdown(null); void captureFromVideo(); }}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {busy ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "📸 Capturer maintenant" : "📸 Capture now")}
            </button>
          ) : (
            <label className="block w-full py-3.5 rounded-xl bg-brand-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all text-center">
              {busy ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "Importer une photo" : "Upload a photo")}
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFilePicked} disabled={busy} />
            </label>
          )}

          <p className="text-[11px] text-brand-text-secondary mt-3 text-center">
            {isFR
              ? "Capture automatique après le compte à rebours. Tenez la pose. Vos photos restent privées."
              : "Auto-captures after the countdown — just hold the pose. Your photos stay private."}
          </p>
        </div>
      </div>
    </div>
  );
};
