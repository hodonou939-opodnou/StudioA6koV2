// Best-effort country (ISO-2) for social-proof labels — never blocks UX, never
// stores precise location. Tries instant proxy headers first, then a keyless
// geo-IP lookup with a short timeout. Returns null when unknown.
export async function countryFromRequest(req: Request): Promise<string | null> {
  const h = (n: string) => req.headers.get(n) || "";

  const direct =
    h("x-vercel-ip-country") ||
    h("cf-ipcountry") ||
    h("x-appengine-country") ||
    h("x-country-code");
  if (direct && direct.length === 2 && direct.toUpperCase() !== "ZZ") {
    return direct.toUpperCase();
  }

  const ip = (h("x-forwarded-for").split(",")[0] || "").trim();
  if (!ip || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.") || ip === "127.0.0.1") {
    return null;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`https://ipapi.co/${ip}/country/`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const c = (await r.text()).trim();
      if (/^[A-Z]{2}$/i.test(c)) return c.toUpperCase();
    }
  } catch {
    /* ignore — country is optional */
  }
  return null;
}
