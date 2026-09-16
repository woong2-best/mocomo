import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompleteAvatarForm } from "./complete-avatar-form";

export const dynamic = "force-dynamic";

export default async function CompleteAvatarPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  let initialImage = "";
  if (session?.user?.id) {
    const row = await db.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });
    initialImage = row?.image ?? "";
  }
  return <CompleteAvatarForm dest={sp.dest} initialImage={initialImage} />;
}
