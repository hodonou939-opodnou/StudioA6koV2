"use client";

// Holds a generation request the user fired while logged out, so that after
// they authenticate we can resume it seamlessly and consume one credit —
// exactly the "fill form → click Lancer → login → it just continues" flow.

import type { GenerateRequest } from "./ai/router";

let pending: GenerateRequest | null = null;

export function holdRequest(req: GenerateRequest) {
  pending = req;
  // survive an OAuth full-page redirect round-trip
  try {
    sessionStorage.setItem("a6ko_pending_request", JSON.stringify(req));
  } catch {}
}

export function takePendingRequest(): GenerateRequest | null {
  if (!pending) {
    try {
      const raw = sessionStorage.getItem("a6ko_pending_request");
      if (raw) pending = JSON.parse(raw) as GenerateRequest;
    } catch {}
  }
  const req = pending;
  pending = null;
  try {
    sessionStorage.removeItem("a6ko_pending_request");
  } catch {}
  return req;
}

export function hasPendingRequest() {
  return !!pending || !!safeGet("a6ko_pending_request");
}

function safeGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
