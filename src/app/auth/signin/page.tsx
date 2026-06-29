import { getAuthConfigStatus } from "@/lib/auth-env";
import { APT_GAME_PATH } from "@/lib/site-routes";
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
      callbackUrl={sp.callbackUrl?.trim() || APT_GAME_PATH}
      initialEmail={sp.email?.trim() || ""}
      errorParam={sp.error ?? null}
    />
  );
}
