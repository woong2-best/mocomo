import { redirect } from "next/navigation";
import type { AdultVerificationScope } from "@prisma/client";
import { getCachedCurrentUser } from "@/lib/auth";
import { isAdultVerified } from "@/lib/adult-verification/is-verified";
import { PortOneIdentityScript } from "@/components/adult-verification/portone-identity-sdk";
import { MobileAdultVerifyClient } from "./mobile-adult-verify-client";

function parseScope(raw: string | undefined): AdultVerificationScope {
  if (raw === "USED_MARKET") return "USED_MARKET";
  if (raw === "GLOBAL") return "GLOBAL";
  return "DM_PAID";
}

export default async function MobileAdultVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/auth/mobile/adult-verify");

  const { scope: scopeRaw } = await searchParams;
  const scope = parseScope(scopeRaw);
  const alreadyVerified = isAdultVerified(user);

  return (
    <>
      <PortOneIdentityScript />
      <MobileAdultVerifyClient scope={scope} alreadyVerified={alreadyVerified} />
    </>
  );
}
