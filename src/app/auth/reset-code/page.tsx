import { redirect } from "next/navigation";

export default async function ResetCodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const q = email ? `?email=${encodeURIComponent(email)}&mode=reset` : "?mode=reset";
  redirect(`/auth/email-verify${q}`);
}
