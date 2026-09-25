import { notFound } from "next/navigation";
import { getCommunityServerContext } from "@/lib/community-server/server-data";
import { PostsChannelView } from "@/components/community-server/channels/posts-channel";

export default async function CommunityRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getCommunityServerContext(slug);
  if (!ctx) notFound();

  return <PostsChannelView communitySlug={slug} communityId={ctx.communityId} />;
}
