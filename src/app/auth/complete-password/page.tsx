import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasSignupNeedsIdentityCookie } from "@/lib/signup-identity-onboarding";
import { CompletePasswordForm } from "./complete-password-form";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string | undefined {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return undefined;
}

export default async function CompletePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const needs = await hasSignupNeedsIdentityCookie();
  if (!needs) {
    redirect("/");
  }

  const sp = await searchParams;
  return <CompletePasswordForm dest={safeDest(sp.dest)} />;
}
