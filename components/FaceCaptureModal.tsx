"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  isFR: boolean;
  startAngle?: "front" | "left" | "right" | "extra";
  onClose: () => void;
  onSaved: () => void; // called after at least one angle is saved
};

const STEPS = [
  { angle: "front", fr: "Regardez droit devant 🙂", en: "Look straight ahead 🙂" },
  { angle: "left", fr: "Tournez doucement la tête à gauche ⬅️", en: "Turn your head slightly left ⬅️" },
  { angle: "right", fr: "Tournez doucement la tête à droite ➡️", en: "Turn your head slightly right ➡️" },
] as const;

// Guided multi-angle face capture. Uses the live front camera when available,
// with a photo-upload fallback (in-app browsers often block getUserMedia).
export const FaceCaptureModal: React.FC<Props> = ({ isFR, startAngle, onClose, onSaved }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stepIdx, setStepIdx] = useState(() => {
    const i = STEPS.findIndex((s) => s.angle === startAngle);
    return i >= 0 ? i : 0;
  });
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const step = STEPS[stepIdx];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
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

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function saveBase64(base64: string) {
    setBusy(true);
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
      if (!res.ok) throw new Error("save failed");
      const next = savedCount + 1;
      setSavedCount(next);
      onSaved();
      if (stepIdx < STEPS.length - 1) {
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
    if (!v || busy) return;
    const size = Math.min(v.videoWidth, v.videoHeight) || 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
    await saveBase64(canvas.toDataURL("image/png"));
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveBase64(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[110] bg-brand-text/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-brand-surface rounded-3xl shadow-2xl w-full max-w-md border border-brand-primary/10 overflow-hidden">
        <div className="p-6 text-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
              {isFR ? "Capture du visage" : "Face capture"} · {stepIdx + 1}/{STEPS.length}
            </span>
            <button onClick={() => { stopCamera(); onClose(); }} className="text-brand-text-secondary hover:text-brand-text text-xs font-bold uppercase">
              {isFR ? "Fermer" : "Close"}
            </button>
          </div>

          <h3 className="text-base font-black text-brand-text mb-3">{isFR ? step.fr : step.en}</h3>

          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-brand-bg mb-4 border border-brand-secondary/30">
            {!camError ? (
              <>
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                {/* Face oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-1/2 h-3/4 rounded-[50%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                </div>
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
              onClick={captureFromVideo}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {busy ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "📸 Capturer cet angle" : "📸 Capture this angle")}
            </button>
          ) : (
            <label className="block w-full py-3.5 rounded-xl bg-brand-primary text-white font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all">
              {busy ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "Importer une photo" : "Upload a photo")}
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFilePicked} disabled={busy} />
            </label>
          )}

          <p className="text-[11px] text-brand-text-secondary mt-3">
            {isFR
              ? "Vos photos de visage restent privées et servent uniquement à améliorer vos propres créations."
              : "Your face photos stay private and are only used to improve your own creations."}
          </p>
        </div>
      </div>
    </div>
  );
};
