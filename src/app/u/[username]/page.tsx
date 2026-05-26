import { Suspense } from "react";
import { ProfileHeaderAsync } from "@/components/profile/profile-header-async";
import { ProfileBodyAsync } from "@/components/profile/profile-body-async";
import { ProfileHeaderSkeleton, ProfileTimelineSkeleton } from "@/components/ui/content-skeletons";

export default function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/40">
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <ProfilePageHeader params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ProfileTimelineSkeleton />}>
        <ProfilePageBody params={params} searchParams={searchParams} />
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

async function ProfilePageBody({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  return <ProfileBodyAsync username={username} tabParam={tab} />;
}
