"use client";

import dynamic from "next/dynamic";

// Mount the studio client-side only (it relies on browser APIs and behaves like
// the original Vite SPA). This is where the full ported UI lives.
const StudioApp = dynamic(() => import("@/components/StudioApp"), { ssr: false });

export default function Home() {
  return <StudioApp />;
}
