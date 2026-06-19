"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StudioAsset, StudioCreatorProfile, User } from "@prisma/client";
import { toggleStudioFollow } from "@/studio/actions/creator";
import { AssetCard } from "@/studio/components/asset-card";
import { Button } from "@/components/ui/button";

type Props = {
  profile: StudioCreatorProfile & { user: Pick<User, "id" | "username" | "name" | "image"> };
  assets: StudioAsset[];
  isFollowing: boolean;
  isSelf: boolean;
};

export function CreatorProfileClient({ profile, assets, isFollowing, isSelf }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white">
        <div className="h-32 bg-gradient-to-r from-pink-100 to-violet-100" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{profile.displayName}</h1>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            </div>
            {!isSelf && (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                disabled={pending}
                onClick={() => startTransition(async () => { await toggleStudioFollow(profile.userId); router.refresh(); })}
              >
                {isFollowing ? "팔로잉" : "팔로우"}
              </Button>
            )}
          </div>
          {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>팔로워 {profile.followerCount}</span>
            <span>♥ {profile.totalLikes}</span>
            <span>↓ {profile.totalDownloads}</span>
            <span>판매 {profile.totalSales}</span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-semibold">작품</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={{ ...a, creator: profile.user }} href={`/studio/market/${a.id}`} />
          ))}
        </div>
        {!assets.length && <p className="text-muted-foreground">배포된 작품이 없습니다.</p>}
      </section>

      {isSelf && (
        <Button asChild variant="outline">
          <Link href="/studio/settings">크리에이터 설정</Link>
        </Button>
      )}
    </div>
  );
}
