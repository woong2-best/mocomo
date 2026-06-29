import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCachedCurrentUser } from "@/lib/auth";
import { getCommunityBySlug } from "@/actions/community-hub";
import { CommunitySubnav } from "@/components/communities/community-subnav";
import { CommunitySettingsForm } from "@/components/communities/community-settings-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { ChevronLeft } from "lucide-react";

export default async function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCachedCurrentUser();
  if (!user) redirect(`/auth/signin?callbackUrl=/c/${slug}/settings`);

  const data = await getCommunityBySlug(slug);
  if (!data) notFound();

  const { community } = data;
  if (community.creatorId !== user.id) {
    redirect(`/c/${slug}`);
  }

  return (
    <AppPageChrome maxWidth="lg">
      <Link
        href={`/c/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {community.name}
      </Link>

      <NativePageTitle>
        <h1 className="text-xl font-bold">커뮤니티 설정</h1>
      </NativePageTitle>
      <CommunitySubnav slug={slug} />

      <CommunitySettingsForm
        communityId={community.id}
        slug={slug}
        initial={{
          name: community.name,
          description: community.description,
          category: community.category,
          isNsfw: community.isNsfw,
        }}
      />
    </AppPageChrome>
  );
}
