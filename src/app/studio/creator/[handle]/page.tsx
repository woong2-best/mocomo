import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudioCreatorByHandle, isFollowingCreator } from "@/studio/actions/creator";
import { CreatorProfileClient } from "@/studio/components/creator-profile-client";

export default async function StudioCreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const data = await getStudioCreatorByHandle(handle);
  if (!data) notFound();

  const session = await auth();
  const isSelf = session?.user?.id === data.profile.userId;
  const isFollowing =
    session?.user?.id && !isSelf ? await isFollowingCreator(data.profile.userId) : false;

  return (
    <CreatorProfileClient
      profile={data.profile}
      assets={data.assets}
      featured={data.featured}
      isFollowing={!!isFollowing}
      isSelf={isSelf}
    />
  );
}
