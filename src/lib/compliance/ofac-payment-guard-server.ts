import { headers } from "next/headers";
import { db } from "@/lib/db";
import { assertCountrySelectable } from "@/lib/compliance/ofac-sanctioned-countries";
import {
  assertOfacPaymentAllowed,
  validatePaymentPayloadCountries,
} from "@/lib/compliance/ofac-payment-guard";
import { getRequestCountryFromHeaders } from "@/lib/compliance/request-country";

export async function getRequestGeoCountry(): Promise<string | null> {
  try {
    const h = await headers();
    return getRequestCountryFromHeaders(h);
  } catch {
    return null;
  }
}

export async function assertOfacPaymentAllowedForUser(
  userId: string,
  geoCountry?: string | null
): Promise<{ error: string } | null> {
  const resolvedGeo = geoCountry ?? (await getRequestGeoCountry());
  const geoBlock = assertOfacPaymentAllowed(resolvedGeo);
  if (geoBlock) return geoBlock;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { countryCode: true },
  });
  return assertCountrySelectable(user?.countryCode);
}

export async function assertOfacPaymentRequestAllowed(
  userId: string,
  payload?: Record<string, unknown>
): Promise<{ error: string } | null> {
  const userBlock = await assertOfacPaymentAllowedForUser(userId);
  if (userBlock) return userBlock;
  if (payload) {
    return validatePaymentPayloadCountries(payload);
  }
  return null;
}
