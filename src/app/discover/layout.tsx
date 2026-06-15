import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DiscoverLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/discover");
  return children;
}
