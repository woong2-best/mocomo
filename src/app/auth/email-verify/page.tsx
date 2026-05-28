import { Suspense } from "react";
import { EmailVerifySkeleton } from "@/components/auth/email-verify-skeleton";
import { EmailVerifyFormInner } from "./email-verify-form";

export default function EmailVerifyPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<EmailVerifySkeleton />}>
        <EmailVerifyFormInner />
      </Suspense>
    </div>
  );
}
