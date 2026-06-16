import { Suspense } from "react";
import { ProfileHeaderAsync } from "@/components/profile/profile-header-async";
import { ProfileTimelineAsync } from "@/components/profile/profile-timeline-async";
import { ProfileSupportAsync } from "@/components/profile/profile-support-async";
import { ProfileWebtoonsAsync } from "@/components/profile/profile-webtoons-async";
import { ProfileMinigameAsync } from "@/components/profile/profile-minigame-async";
import { ProfileSupportSkeleton } from "@/components/profile/profile-support-skeleton";
import { ProfileHeaderSkeleton, ProfileTimelineSkeleton } from "@/components/ui/content-skeletons";

export default function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; kind?: string }>;
}) {
  return (
    <div className="max-w-5xl mx-auto min-h-screen border-x border-border/40">
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <ProfilePageHeader params={params} searchParams={searchParams} />
      </Suspense>
      <div className="lg:grid lg:grid-cols-[1fr_300px]">
        <Suspense fallback={<ProfileTimelineSkeleton />}>
          <ProfilePageTimeline params={params} searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <aside className="hidden lg:block border-l border-border/40 p-4">
              <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
            </aside>
          }
        >
          <aside className="hidden lg:block border-l border-border/40 p-4 space-y-4">
            <ProfilePageWebtoons params={params} />
            <ProfilePageMinigame params={params} />
          </aside>
        </Suspense>
      </div>
      <Suspense fallback={<ProfileSupportSkeleton />}>
        <ProfilePageSupport params={params} />
      </Suspense>
    </div>
  );
}

async function ProfilePageHeader({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  return <ProfileHeaderAsync username={username} tabParam={tab} />;
}

async function ProfilePageTimeline({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; kind?: string }>;
}) {
  const { username } = await params;
  const { tab, sort, kind } = await searchParams;
  return (
    <ProfileTimelineAsync
      username={username}
      tabParam={tab}
      sortParam={sort}
      kindParam={kind}
    />
  );
}

async function ProfilePageSupport({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileSupportAsync username={username} />;
}

async function ProfilePageWebtoons({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileWebtoonsAsync username={username} />;
}

async function ProfilePageMinigame({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileMinigameAsync username={username} />;
}
