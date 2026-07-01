import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const exists = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!exists) notFound();
  redirect(`/u/${username}/connections?tab=following`);
}
