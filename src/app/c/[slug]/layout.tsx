import { notFound } from "next/navigation";
import { getCommunityServerContext, getCommunityMembersForSidebar } from "@/lib/community-server/server-data";
import { CommunityServerLayoutClient } from "@/components/community-server/server-layout-client";

export const dynamic = "force-dynamic";
/** First visit may seed channels via ensureCommunityServerProvisioned (~10s+). */
export const maxDuration = 60;

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getCommunityServerContext(slug);
  if (!ctx) notFound();

  const initialMembers =
    ctx.isPublic || ctx.isMember || ctx.isOwner
      ? await getCommunityMembersForSidebar(ctx.communityId)
      : [];

  return (
    <CommunityServerLayoutClient slug={slug} initialContext={ctx} initialMembers={initialMembers}>
      {children}
    </CommunityServerLayoutClient>
  );
}
