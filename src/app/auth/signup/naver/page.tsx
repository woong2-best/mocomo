import { Suspense } from "react";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignupNaverForm } from "./signup-naver-form";

export default function SignupNaverPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <SignupNaverForm />
      </Suspense>
    </>
  );
}
