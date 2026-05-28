import { EmailVerifySkeleton } from "@/components/auth/email-verify-skeleton";

export default function EmailVerifyLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <EmailVerifySkeleton />
    </div>
  );
}
