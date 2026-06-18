// Moneroo payment helpers. https://docs.moneroo.io/payments
const BASE = "https://api.moneroo.io/v1";

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${process.env.MONEROO_SECRET_KEY}`,
  };
}

export type MonerooCustomer = {
  email: string;
  first_name: string;
  last_name: string;
};

// Create a hosted-checkout payment. Returns the Moneroo transaction id + checkout URL.
export async function initPayment(params: {
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  customer: MonerooCustomer;
  metadata: { key: string; value: string }[];
}): Promise<{ id: string; checkoutUrl: string }> {
  // Moneroo expects metadata as an OBJECT ({k: v}), NOT an array — an array 422s.
  const metaObj: Record<string, string> = {};
  for (const m of params.metadata) metaObj[m.key] = m.value;

  const res = await fetch(`${BASE}/payments/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      return_url: params.returnUrl,
      customer: params.customer,
      metadata: metaObj,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Moneroo initialize failed");
  return { id: json.data.id, checkoutUrl: json.data.checkout_url };
}

// Authoritative server-side verification — the source of truth for granting credits.
export async function verifyPayment(id: string): Promise<{
  id: string;
  status: "success" | "pending" | "failed";
  amount: number;
  metadata?: Record<string, string>;
}> {
  const res = await fetch(`${BASE}/payments/${encodeURIComponent(id)}/verify`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Moneroo verify failed");
  return json.data;
}
