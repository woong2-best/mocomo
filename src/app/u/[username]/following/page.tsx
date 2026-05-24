import { notFound } from "next/navigation";
import { UserListPage } from "@/components/profile/user-list";
import { db } from "@/lib/db";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const exists = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!exists) notFound();
  return <UserListPage username={username} type="following" />;
}
