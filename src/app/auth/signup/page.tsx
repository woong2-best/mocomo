import { getAuthConfigStatus } from "@/lib/auth-env";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  const { googleOAuth, discordOAuth } = getAuthConfigStatus();
  return <SignUpForm googleOAuth={googleOAuth} discordOAuth={discordOAuth} />;
}
