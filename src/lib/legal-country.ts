import { cookies } from "next/headers";
import { getCachedSession } from "@/lib/auth";

/** Resolve country for legal supplemental clauses — session → cookie → KR default */
export async function resolveLegalCountryCode(): Promise<string> {
  const session = await getCachedSession();
  const fromSession = session?.user?.countryCode;
  if (fromSession && typeof fromSession === "string") {
    return fromSession.trim().toUpperCase();
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("country")?.value ?? cookieStore.get("countryCode")?.value;
  if (fromCookie) {
    return fromCookie.trim().toUpperCase();
  }

  return "KR";
}
