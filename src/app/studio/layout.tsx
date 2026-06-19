import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { StudioShell } from "@/studio/components/studio-shell";
import "./studio.css";

export const metadata: Metadata = {
  title: "MoCoMo Studio",
  description: "MoCoMo 창작 플랫폼 — 3D 자산 제작·마켓·크리에이터",
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isReviewer =
    !!session?.user?.username &&
    !!session?.user?.role &&
    isOperatorIdentity({ username: session.user.username, role: session.user.role });

  return <StudioShell isReviewer={isReviewer}>{children}</StudioShell>;
}
