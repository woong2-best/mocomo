import {
  isOfacSanctionedCountry,
  OFAC_REGION_UNAVAILABLE_MESSAGE,
} from "@/lib/compliance/ofac-sanctioned-countries";

const PAYMENT_API_PREFIXES = ["/api/mobile/checkout", "/api/mobile/payment-methods"] as const;

const PAYMENT_PAGE_PREFIXES = ["/payments", "/premium"] as const;

const COUNTRY_PAYLOAD_KEY = /country/i;

export function isPaymentGuardPath(pathname: string): boolean {
  if (PAYMENT_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (/^\/api\/mobile\/market\/[^/]+\/checkout$/.test(pathname)) {
    return true;
  }
  return PAYMENT_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function assertOfacPaymentAllowed(
  geoCountry: string | null | undefined
): { error: string } | null {
  if (isOfacSanctionedCountry(geoCountry)) {
    return { error: OFAC_REGION_UNAVAILABLE_MESSAGE };
  }
  return null;
}

function scanCountryPayload(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 2 && isOfacSanctionedCountry(trimmed)) return trimmed.toUpperCase();
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = scanCountryPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (COUNTRY_PAYLOAD_KEY.test(key) && typeof nested === "string") {
        if (isOfacSanctionedCountry(nested)) return nested.trim().toUpperCase();
      }
      const found = scanCountryPayload(nested, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export function validatePaymentPayloadCountries(
  payload: Record<string, unknown>
): { error: string } | null {
  const blocked = scanCountryPayload(payload);
  if (blocked) {
    return { error: OFAC_REGION_UNAVAILABLE_MESSAGE };
  }
  return null;
}
