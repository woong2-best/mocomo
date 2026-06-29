import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const username = session.user.username;
  if (username) redirect(`/u/${username}`);
  redirect("/settings");
}
