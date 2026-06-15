// Server-authoritative credit packs. Amounts/credits are NEVER taken from the client.
export type PackId = "discovery" | "creator" | "studio" | "pro";

export const PACKS: Record<PackId, { credits: number; amount: number; currency: string; label: string }> = {
  discovery: { credits: 5, amount: 500, currency: "XOF", label: "Pack Découverte" },
  creator: { credits: 30, amount: 2499, currency: "XOF", label: "Pack Créateur" },
  studio: { credits: 100, amount: 6999, currency: "XOF", label: "Pack Studio" },
  pro: { credits: 300, amount: 14999, currency: "XOF", label: "Pro Mensuel" },
};

export function isPackId(x: string): x is PackId {
  return x in PACKS;
}
