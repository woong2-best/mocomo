import { Suspense } from "react";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignupApplyForm } from "./signup-apply-form";

type Sp = {
  from?: string;
  platform?: string;
  redirect_uri?: string;
  addAccount?: string;
};

export default async function SignupApplyPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  const sp = await searchParams;
  const fromMobile = sp.from === "mobile";
  const platform = sp.platform === "ios" ? "ios" : "android";
  const { googleOAuth } = getAuthConfigStatus();

  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <SignupApplyForm
          googleOAuth={googleOAuth}
          fromMobile={fromMobile}
          platform={platform}
        />
      </Suspense>
    </>
  );
}
