import { getAuthConfigStatus } from "@/lib/auth-env";
import { SignupApplyForm } from "./signup-apply-form";

export default function SignupApplyPage() {
  const { googleOAuth, discordOAuth } = getAuthConfigStatus();
  return <SignupApplyForm googleOAuth={googleOAuth} discordOAuth={discordOAuth} />;
}
