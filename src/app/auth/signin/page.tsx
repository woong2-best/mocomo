import { getAuthConfigStatus } from "@/lib/auth-env";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
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
  const { googleOAuth, discordOAuth, twitterOAuth } = getAuthConfigStatus();

  return (
    <SignInForm
      googleOAuth={googleOAuth}
      discordOAuth={discordOAuth}
      twitterOAuth={twitterOAuth}
      callbackUrl={sp.callbackUrl?.trim() || DEFAULT_LANDING_PATH}
      initialEmail={sp.email?.trim() || ""}
      errorParam={sp.error ?? null}
    />
  );
}
