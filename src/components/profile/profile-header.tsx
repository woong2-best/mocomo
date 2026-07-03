import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Calendar, Cake, Link2, MapPin, Camera, BadgeCheck } from "lucide-react";
import { formatProfileBirthday } from "@/lib/birth-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileActionMenu } from "@/components/profile/profile-action-menu";
import { SupportTierLevel } from "@prisma/client";
import type { ReactNode } from "react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { CreatorFollowerBadge } from "@/components/user/creator-follower-badge";
import { creatorBadgeFromFollowerCount } from "@/lib/creator-follower-badge";
import { CountryFlag } from "@/components/user/country-flag";
import { userAvatarFallbackInitial, userDisplayName } from "@/lib/user-public-select";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

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
}: {
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    level: number;
    supportTierSent: SupportTierLevel;
    countryCode?: string;
    birthDate?: Date | null;
    createdAt: Date;
    profile: {
      bio: string | null;
      bannerUrl: string | null;
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
}) {
  const sns = (user.profile?.snsLinks ?? {}) as SnsLinks;
  const displayName = userDisplayName(user);
  const creatorBadge = creatorBadgeFromFollowerCount(user._count.followers);
  const showBirthday =
    !!user.birthDate &&
    (isSelf || !!user.profile?.showBirthdayOnProfile);
  const isBlocked = blockedByViewer || blockedViewer;

  return (
    <div className="border-b border-border/60">
      <div className="sticky top-14 z-20 flex items-center gap-4 px-4 py-2 bg-background/90 backdrop-blur-md border-b border-border/40">
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
            <CreatorFollowerBadge badge={creatorBadge} size="sm" showLabel={false} />
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

      <div
        className="h-36 sm:h-44 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30"
        style={
          user.profile?.bannerUrl
            ? { backgroundImage: `url(${user.profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />

      <div className="px-4 pb-4">
        <div className="-mt-14 sm:-mt-16">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-2xl">{userAvatarFallbackInitial(user)}</AvatarFallback>
          </Avatar>
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
          <span>Lv.{user.level}</span>
        </div>

        {user.profile?.mainCharacter && (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">최애 </span>
            {user.profile.mainCharacter}
          </p>
        )}

        <div className="flex gap-4 mt-3 text-sm">
          <Link href={`/u/${user.username}/connections?tab=following`} className="hover:underline">
            <span className="font-bold text-foreground">{user._count.following}</span>{" "}
            <span className="text-muted-foreground">팔로잉</span>
          </Link>
          <Link href={`/u/${user.username}/connections?tab=followers`} className="hover:underline">
            <span className="font-bold text-foreground">{user._count.followers}</span>{" "}
            <span className="text-muted-foreground">팔로워</span>
          </Link>
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

        {user.cosplayerProfile ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-4 w-4 text-pink-500" />
                코스어
              </div>
              <Link
                href={`/cosplay/${user.username}`}
                className="text-xs text-primary hover:underline shrink-0"
              >
                갤러리 보기 →
              </Link>
            </div>
            {user.cosplayerProfile.bio && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {user.cosplayerProfile.bio}
              </p>
            )}
            {user.cosplayerProfile.animeLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.cosplayerProfile.animeLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`/anime/${link.anime.slug}?tab=cosplayers`}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/15 hover:bg-primary/25 text-primary"
                  >
                    {link.anime.title}
                    {link.character ? ` · ${link.character}` : ""}
                  </Link>
                ))}
              </div>
            )}
            {user.cosplayerProfile.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {user.cosplayerProfile.photos.map((photo) => (
                  <Link
                    key={photo.id}
                    href={`/cosplay/${user.username}`}
                    className="shrink-0 rounded-lg overflow-hidden border border-border/60 hover:border-primary/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.character || "코스프레"}
                      className="h-24 w-20 object-cover"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : isSelf ? (
          <Link
            href="/cosplay/apply"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Camera className="h-4 w-4" />
            코스어 신청하기
          </Link>
        ) : null}

        {!isBlocked && (
          <div className="mt-4 flex gap-2 flex-wrap">
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
    </div>
  );
}
