import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { GroupCreateForms } from "./group-create-forms";

export default async function NewGroupRoomPage() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/messages/groups/new");

  const cosplayer = await db.cosplayerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <GroupCreateForms isCosplayer={!!cosplayer} />
    </div>
  );
}
