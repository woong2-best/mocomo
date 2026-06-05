import { getAuthConfigStatus } from "@/lib/auth-env";
import { SignInForm } from "./signin-form";

type SearchParams = {
  callbackUrl?: string;
  email?: string;
  error?: string;
  reset?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { googleOAuth, discordOAuth } = getAuthConfigStatus();

  return (
    <SignInForm
      googleOAuth={googleOAuth}
      discordOAuth={discordOAuth}
      callbackUrl={sp.callbackUrl?.trim() || "/"}
      initialEmail={sp.email?.trim() || ""}
      errorParam={sp.error ?? null}
    />
  );
}
