import { redirect } from "next/navigation";

export default async function VerifyPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const q = email ? `?email=${encodeURIComponent(email)}&mode=signup` : "?mode=signup";
  redirect(`/auth/email-verify${q}`);
}
