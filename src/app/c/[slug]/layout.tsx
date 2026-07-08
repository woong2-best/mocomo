import { notFound } from "next/navigation";
import { getCommunityServerContext } from "@/lib/community-server/server-data";
import { CommunityServerLayoutClient } from "@/components/community-server/server-layout-client";

export const dynamic = "force-dynamic";

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

  // 멤버 목록은 사이드바에서 클라이언트 fetch — layout을 막지 않음
  return (
    <CommunityServerLayoutClient slug={slug} initialContext={ctx} initialMembers={[]}>
      {children}
    </CommunityServerLayoutClient>
  );
}
