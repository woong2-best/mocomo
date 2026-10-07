import { Suspense } from "react";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignupGmailForm } from "./signup-gmail-form";
import { SignupAgeBlockNotice } from "@/components/auth/signup-age-block-notice";

export default function SignupGmailPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <SignupAgeBlockNotice>
          <SignupGmailForm />
        </SignupAgeBlockNotice>
      </Suspense>
    </>
  );
}
