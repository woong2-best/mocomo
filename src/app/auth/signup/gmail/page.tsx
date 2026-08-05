import { Suspense } from "react";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignupGmailForm } from "./signup-gmail-form";

export default function SignupGmailPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <SignupGmailForm />
      </Suspense>
    </>
  );
}
