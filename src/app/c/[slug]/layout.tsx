import { notFound } from "next/navigation";
import { getCommunityServerContext } from "@/actions/community-server";
import { getCommunityMembersForSidebar } from "@/actions/community-server";
import { CommunityServerLayoutClient } from "@/components/community-server/server-layout-client";

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

  const members = await getCommunityMembersForSidebar(ctx.communityId);

  return (
    <CommunityServerLayoutClient slug={slug} initialContext={ctx} initialMembers={members}>
      {children}
    </CommunityServerLayoutClient>
  );
}
