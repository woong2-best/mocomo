import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompleteBirthDateForm } from "./complete-birth-date-form";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string | undefined {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return undefined;
}

export default async function CompleteBirthDatePage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { birthDate: true },
  });
  if (user?.birthDate) {
    const sp = await searchParams;
    const dest = safeDest(sp.dest);
    redirect(dest ?? "/");
  }

  const sp = await searchParams;
  return <CompleteBirthDateForm dest={safeDest(sp.dest)} />;
}
