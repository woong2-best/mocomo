import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasSignupNeedsIdentityCookie } from "@/lib/signup-identity-onboarding";
import { CompleteProfileForm } from "./complete-profile-form";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string | undefined {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return undefined;
}

export default async function CompleteProfilePage({
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
  const dest = safeDest(sp.dest);
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true },
  });
  if (!user) redirect("/auth/signin");

  return (
    <CompleteProfileForm
      dest={dest}
      initialUsername={user.username}
      initialName={user.name ?? ""}
    />
  );
}
