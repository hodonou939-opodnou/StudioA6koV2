"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  isFR: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// 4 guided angles for solid 3D facial morphology.
const STEPS = [
  { angle: "front", fr: "Regardez droit dans la caméra 🙂", en: "Look straight into the camera 🙂" },
  { angle: "left", fr: "Tournez légèrement la tête à gauche ⬅️", en: "Turn your head slightly left ⬅️" },
  { angle: "right", fr: "Tournez légèrement la tête à droite ➡️", en: "Turn your head slightly right ➡️" },
  { angle: "up", fr: "Relevez légèrement le menton ⬆️", en: "Lift your chin slightly ⬆️" },
] as const;

// Guided multi-angle face capture: wide live preview + hands-free 3-2-1 countdown
// auto-capture (hold the pose). Photo-upload fallback when the camera is blocked.
export const FaceCaptureModal: React.FC<Props> = ({ isFR, onClose, onSaved }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState(false);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const step = STEPS[stepIdx];

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

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

  const saveBase64 = useCallback(
    async (base64: string) => {
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
          // Max reached — treat as done.
          onSaved();
          stopCamera();
          onClose();
          return;
        }
        if (!res.ok) throw new Error("save failed");
        onSaved();
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
        setStepIdx((i) => {
          if (i < STEPS.length - 1) return i + 1;
          stopCamera();
          onClose();
          return i;
        });
      } catch {
        alert(isFR ? "Échec de l'enregistrement. Réessayez." : "Save failed. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [step.angle, isFR, onSaved, onClose, stopCamera],
  );

  const captureFromVideo = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    await saveBase64(canvas.toDataURL("image/jpeg", 0.92));
  }, [saveBase64]);

  // Hands-free countdown → auto-capture. Capture is fired from the interval
  // callback (NEVER inside a setState updater — that crashes React 19).
  useEffect(() => {
    if (!ready || camError || busy) return;
    let n = 3;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setCountdown(null);
        void captureFromVideo();
      } else {
        setCountdown(n);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [ready, stepIdx, camError, busy, captureFromVideo]);

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
              {isFR ? "Capture du visage" : "Face capture"} · {stepIdx + 1}/{STEPS.length}
            </span>
            <button onClick={() => { stopCamera(); onClose(); }} className="text-brand-text-secondary hover:text-brand-text text-xs font-bold uppercase">
              {isFR ? "Fermer" : "Close"}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i < stepIdx ? "w-6 bg-brand-primary" : i === stepIdx ? "w-6 bg-brand-primary/60" : "w-1.5 bg-brand-secondary/40"}`} />
            ))}
          </div>

          <h3 className="text-base sm:text-lg font-black text-brand-text mb-3 text-center">{isFR ? step.fr : step.en}</h3>

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-brand-bg mb-4 border border-brand-secondary/30">
            {!camError ? (
              <>
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[60%] h-[88%] rounded-[50%] border-2 border-white/70" />
                </div>
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-7xl font-black drop-shadow-lg">{countdown}</span>
                  </div>
                )}
                {flash && <div className="absolute inset-0 bg-white/80" />}
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
              ? "Capture automatique après le compte à rebours — tenez la pose. Vos photos restent privées."
              : "Auto-captures after the countdown — just hold the pose. Your photos stay private."}
          </p>
        </div>
      </div>
    </div>
  );
};
