import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Calendar, Cake, Link2, MapPin, BadgeCheck, Lock } from "lucide-react";
import { formatProfileBirthday } from "@/lib/birth-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileActionMenu } from "@/components/profile/profile-action-menu";
import { SupportTierLevel } from "@prisma/client";
import type { AccountStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { isReadOnlySuspended } from "@/lib/account-status";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { CreatorFollowerBadge } from "@/components/user/creator-follower-badge";
import { creatorBadgeFromFollowerCount } from "@/lib/creator-follower-badge";
import { CountryFlag } from "@/components/user/country-flag";
import { userAvatarFallbackInitial, userDisplayName } from "@/lib/user-public-select";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { ProfileHeaderFeedActions } from "@/components/profile/profile-header-feed-actions";
import {
  ProfileLiveAvatarRing,
  ProfileLiveBanner,
} from "@/components/profile/profile-live-banner";
import { ProfileBannerMedia } from "@/components/profile/profile-banner-media";
import type { ProfileLiveBroadcast } from "@/lib/profile-live-broadcast";

type SnsLinks = { website?: string; location?: string; twitter?: string };

export function ProfileHeader({
  user,
  isSelf,
  isFollowing,
  followsYou,
  blockedByViewer = false,
  blockedViewer = false,
  mutedByViewer = false,
  actionBar,
  liveBroadcast = null,
}: {
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    accountStatus?: AccountStatus;
    supportTierSent: SupportTierLevel;
    countryCode?: string;
    birthDate?: Date | null;
    createdAt: Date;
    postsLocked?: boolean;
    profile: {
      bio: string | null;
      bannerUrl: string | null;
      bannerVideoUrl?: string | null;
      favoriteTags: string[];
      mainCharacter: string | null;
      snsLinks: unknown;
      showBirthdayOnProfile?: boolean;
    } | null;
    cosplayerProfile: {
      id: string;
      bio: string | null;
      photos: { id: string; url: string; character: string | null }[];
      animeLinks: { id: string; character: string | null; anime: { title: string; slug: string } }[];
    } | null;
    userBadges: { badge: { name: string; imageUrl?: string | null } }[];
    _count: { followers: number; following: number; posts: number };
  };
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  blockedByViewer?: boolean;
  blockedViewer?: boolean;
  mutedByViewer?: boolean;
  actionBar?: ReactNode | null;
  liveBroadcast?: ProfileLiveBroadcast | null;
}) {
  const sns = (user.profile?.snsLinks ?? {}) as SnsLinks;
  const displayName = userDisplayName(user);
  const creatorBadge = creatorBadgeFromFollowerCount(user._count.followers);
  const showBirthday =
    !!user.birthDate &&
    (isSelf || !!user.profile?.showBirthdayOnProfile);
  const isBlocked = blockedByViewer || blockedViewer;
  const isSuspendedProfile = isReadOnlySuspended(user.accountStatus);
  const liveHref = liveBroadcast ? `/voice/${liveBroadcast.channelId}` : null;
  const showLive = !!liveBroadcast && !isBlocked;

  const avatar = (
    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background shrink-0">
      <AvatarImage src={user.image ?? undefined} />
      <AvatarFallback className="text-2xl">{userAvatarFallbackInitial(user)}</AvatarFallback>
    </Avatar>
  );

  return (
    <>
      {/*
        Sticky compact bar must NOT share a parent with the banner/bio.
        Otherwise sticky ends when the banner scrolls away, and the tab bar
        (top: --profile-compact-h) floats mid-feed instead of staying fixed.
      */}
      <div
        className="sticky top-0 z-30 flex h-[var(--profile-compact-h)] items-center gap-4 px-4 bg-background/95 backdrop-blur-md border-b border-border/40 supports-[backdrop-filter]:bg-background/80"
      >
        <Link href={DEFAULT_LANDING_PATH} className="p-2 -ml-2 rounded-full hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <DisplayNameWithSupportTier
              name={displayName}
              tier={user.supportTierSent}
              nameClassName="font-bold"
              compact
            />
            {user.countryCode ? <CountryFlag code={user.countryCode} size={16} className="ml-0.5" /> : null}
            {user.postsLocked ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="잠금" />
            ) : null}
            <CreatorFollowerBadge badge={creatorBadge} size="sm" showLabel={false} />
            {showLive ? (
              <Link
                href={liveHref!}
                className="live-badge ml-0.5 !py-0 hover:brightness-110"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{user._count.posts}개 게시물</p>
        </div>
        {!isSelf && (
          <ProfileActionMenu
            userId={user.id}
            username={user.username}
            initialBlocked={blockedByViewer}
            initialMuted={mutedByViewer}
            className="ml-auto shrink-0"
          />
        )}
      </div>

      <div className="border-b border-border/60">
      {showLive ? <ProfileLiveBanner live={liveBroadcast!} /> : null}
      <div className="relative h-36 sm:h-44 overflow-hidden">
        <ProfileBannerMedia
          bannerUrl={user.profile?.bannerUrl}
          bannerVideoUrl={user.profile?.bannerVideoUrl}
          active
        />
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-14 sm:-mt-16 flex items-end justify-between gap-3">
          {showLive && liveHref ? (
            <ProfileLiveAvatarRing href={liveHref}>{avatar}</ProfileLiveAvatarRing>
          ) : (
            avatar
          )}

          {!isBlocked && (
            <div className="mb-1 flex gap-2 flex-wrap justify-end">
              {isSelf ? (
                <>
                  <Link href="/settings/profile">
                    <Button variant="outline" className="rounded-full font-bold px-5">
                      프로필 수정
                    </Button>
                  </Link>
                  <Link href="/settings/creator">
                    <Button variant="outline" className="rounded-full font-bold px-5">
                      수익 설정
                    </Button>
                  </Link>
                </>
              ) : (
                actionBar
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <DisplayNameWithSupportTier
                name={displayName}
                tier={user.supportTierSent}
                nameClassName="text-xl font-bold"
              />
              {user.countryCode ? <CountryFlag code={user.countryCode} size={20} className="ml-0.5" /> : null}
              {user.postsLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-label="잠금" />
              ) : null}
              {isSuspendedProfile ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  🚫 계정 정지됨
                </span>
              ) : null}
              <CreatorFollowerBadge badge={creatorBadge} size="md" />
            </div>
            {user.userBadges.length > 0 && (
              <BadgeCheck className="h-5 w-5 text-sky-500 shrink-0" aria-label="뱃지" />
            )}
          </div>
          <p className="text-muted-foreground">@{user.username}</p>
          {followsYou && !isSelf && !isBlocked && (
            <span className="inline-block mt-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              나를 팔로우 중
            </span>
          )}
        </div>

        {!isSelf && isBlocked && (
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
            {blockedByViewer ? (
              <p>@{user.username} 님을 차단했습니다. 게시물과 알림이 표시되지 않습니다.</p>
            ) : (
              <p>@{user.username} 님이 회원님을 차단했습니다.</p>
            )}
          </div>
        )}

        {!isSelf && mutedByViewer && !isBlocked && (
          <p className="mt-2 text-xs text-muted-foreground">뮤트된 사용자입니다.</p>
        )}

        {user.profile?.bio && (
          <p className="mt-3 text-[15px] whitespace-pre-wrap">{user.profile.bio}</p>
        )}

        {isSuspendedProfile && (
          <p className="mt-3 text-sm font-medium text-red-600">
            이 계정은 운영원칙 위반으로 인해 읽기 전용 상태입니다.
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
          {sns.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" />
              {sns.location}
            </span>
          )}
          {sns.website && (
            <a
              href={sns.website.startsWith("http") ? sns.website : `https://${sns.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              {sns.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {showBirthday && user.birthDate && (
            <span className="flex items-center gap-1">
              <Cake className="h-4 w-4 shrink-0" />
              {formatProfileBirthday(user.birthDate, { isSelf })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4 shrink-0" />
            {format(user.createdAt, "yyyy년 M월", { locale: ko })} 가입
          </span>
        </div>

        {user.profile?.mainCharacter && (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">최애 </span>
            {user.profile.mainCharacter}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex shrink-0 gap-4 text-sm">
            <Link href={`/u/${user.username}/connections?tab=following`} className="hover:underline">
              <span className="font-bold text-foreground">{user._count.following}</span>{" "}
              <span className="text-muted-foreground">팔로잉</span>
            </Link>
            <Link href={`/u/${user.username}/connections?tab=followers`} className="hover:underline">
              <span className="font-bold text-foreground">{user._count.followers}</span>{" "}
              <span className="text-muted-foreground">팔로워</span>
            </Link>
          </div>
          <ProfileHeaderFeedActions isSelf={isSelf} />
        </div>

        {user.profile?.favoriteTags && user.profile.favoriteTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {user.profile.favoriteTags.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="text-sm text-primary hover:underline"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

      </div>
      </div>
    </>
  );
}
