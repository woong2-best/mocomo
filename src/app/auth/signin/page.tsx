import { getAuthConfigStatus } from "@/lib/auth-env";
import { SignInForm } from "./signin-form";

export default function SignInPage() {
  const { googleOAuth, discordOAuth } = getAuthConfigStatus();
  return <SignInForm googleOAuth={googleOAuth} discordOAuth={discordOAuth} />;
}
