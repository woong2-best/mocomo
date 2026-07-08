import { redirect, notFound } from "next/navigation";
import { getCommunityServerContext } from "@/actions/community-server";
import { getDefaultChannelSlug } from "@/lib/community-server/path";

export default async function CommunityRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getCommunityServerContext(slug);
  if (!ctx) notFound();

  const defaultChannel =
    ctx.channels.find((c) => c.isDefault)?.slug ??
    ctx.channels.find((c) => c.type === "POSTS")?.slug ??
    getDefaultChannelSlug();

  redirect(`/c/${slug}/${defaultChannel}`);
}
