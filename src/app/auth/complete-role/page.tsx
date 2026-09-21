import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOnboardingCosplayers } from "@/lib/signup-role-onboarding";
import { CompleteRoleOnboardingForm } from "./complete-role-form";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string | undefined {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return undefined;
}

export default async function CompleteRolePage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const sp = await searchParams;
  const dest = safeDest(sp.dest);
  const [alreadyCoser, cosplayers] = await Promise.all([
    db.cosplayerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    listOnboardingCosplayers({ take: 24, viewerId: session.user.id }),
  ]);

  return (
    <CompleteRoleOnboardingForm
      dest={dest}
      alreadyCoser={!!alreadyCoser}
      initialCosplayers={cosplayers}
    />
  );
}
