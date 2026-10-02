import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { StudioShell } from "@/studio/components/studio-shell";
import "./studio.css";

export const metadata: Metadata = {
  title: "MoCoMo Studio",
  description: "MoCoMo creator platform — 3D assets, market, and creators",
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isReviewer =
    !!session?.user?.username &&
    !!session?.user?.role &&
    isOperatorIdentity({ username: session.user.username, role: session.user.role });

  return <StudioShell isReviewer={isReviewer}>{children}</StudioShell>;
}
