import "server-only";

const PORTONE_BASE = "https://api.portone.io";

export type PortOneVerifiedCustomer = {
  birthDate?: string;
  name?: string;
  phoneNumber?: string;
};

export type PortOneIdentityVerification = {
  status: "READY" | "VERIFIED" | "FAILED";
  id: string;
  verifiedCustomer?: PortOneVerifiedCustomer;
};

export async function fetchPortOneIdentityVerification(
  identityVerificationId: string
): Promise<PortOneIdentityVerification> {
  const secret = process.env.PORTONE_API_SECRET?.trim();
  if (!secret) throw new Error("PORTONE_NOT_CONFIGURED");

  const res = await fetch(
    `${PORTONE_BASE}/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
    {
      method: "GET",
      headers: { Authorization: `PortOne ${secret}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`PORTONE_LOOKUP_FAILED:${res.status}`);
  }

  return res.json() as Promise<PortOneIdentityVerification>;
}
