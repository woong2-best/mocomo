import { isSignupAgeBlocked, SIGNUP_AGE_BLOCKED_MESSAGE } from "@/lib/signup-age-block";

export async function SignupAgeBlockNotice({ children }: { children: React.ReactNode }) {
  if (await isSignupAgeBlocked()) {
    return <p className="text-sm text-muted-foreground">{SIGNUP_AGE_BLOCKED_MESSAGE}</p>;
  }
  return <>{children}</>;
}
