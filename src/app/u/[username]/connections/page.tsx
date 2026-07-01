import { notFound, redirect } from "next/navigation";
import { UserConnectionsPage } from "@/components/profile/user-connections-page";
import { db } from "@/lib/db";

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const exists = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!exists) notFound();
  return <UserConnectionsPage username={username} tab={tab} />;
}
