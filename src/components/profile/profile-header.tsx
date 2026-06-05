import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Calendar, Cake, Link2, MapPin, Camera, BadgeCheck } from "lucide-react";
import { formatProfileBirthday } from "@/lib/birth-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { StartDmButton } from "@/components/messages/start-dm-button";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import { SupportTierLevel } from "@prisma/client";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { CountryFlag } from "@/components/user/country-flag";

type SnsLinks = { website?: string; location?: string; twitter?: string };

export function ProfileHeader({
  user,
  isSelf,
  isFollowing,
  followsYou,
  viewerSupport,
  paymentsEnabled,
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
    cosplayerProfile: { id: string; stageName: string | null } | null;
    userBadges: { badge: { name: string; imageUrl?: string | null } }[];
    _count: { followers: number; following: number; posts: number };
  };
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  viewerSupport?: {
    tier: SupportTierLevel;
    totalAmount: number;
  } | null;
  paymentsEnabled: boolean;
}) {
  const sns = (user.profile?.snsLinks ?? {}) as SnsLinks;
  const displayName = user.name || user.username;
  const showBirthday =
    !!user.birthDate &&
    (isSelf || !!user.profile?.showBirthdayOnProfile);

  return (
    <div className="border-b border-border/60">
      <div className="sticky top-14 z-20 flex items-center gap-4 px-4 py-2 bg-background/90 backdrop-blur-md border-b border-border/40">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {user.countryCode && <CountryFlag code={user.countryCode} className="text-lg" />}
            <DisplayNameWithSupportTier
              name={displayName}
              tier={user.supportTierSent}
              nameClassName="font-bold"
              compact
            />
          </div>
          <p className="text-xs text-muted-foreground">{user._count.posts}개 게시물</p>
        </div>
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
        <div className="flex justify-between items-start -mt-14 sm:-mt-16">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-2xl">{user.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="pt-3 flex gap-2">
            {isSelf ? (
              <Link href="/settings/profile">
                <Button variant="outline" className="rounded-full font-bold px-5">
                  프로필 수정
                </Button>
              </Link>
            ) : (
              <>
                <ProfileFollowButton userId={user.id} username={user.username} initialFollowing={isFollowing} />
                <TipCreatorDialog
                  creatorId={user.id}
                  username={user.username}
                  displayName={displayName}
                  currentTier={viewerSupport?.tier}
                  currentTotal={viewerSupport?.totalAmount}
                  paymentsEnabled={paymentsEnabled}
                  returnPath={`/u/${user.username}`}
                />
                <StartDmButton userId={user.id} />
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {user.countryCode && (
                <CountryFlag code={user.countryCode} className="text-xl" title={user.countryCode} />
              )}
              <DisplayNameWithSupportTier
                name={displayName}
                tier={user.supportTierSent}
                nameClassName="text-xl font-bold"
              />
            </div>
            {user.userBadges.length > 0 && (
              <BadgeCheck className="h-5 w-5 text-sky-500 shrink-0" aria-label="뱃지" />
            )}
          </div>
          <p className="text-muted-foreground">@{user.username}</p>
          {followsYou && !isSelf && (
            <span className="inline-block mt-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              나를 팔로우 중
            </span>
          )}
        </div>

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
          <Link href={`/u/${user.username}/following`} className="hover:underline">
            <span className="font-bold text-foreground">{user._count.following}</span>{" "}
            <span className="text-muted-foreground">팔로잉</span>
          </Link>
          <Link href={`/u/${user.username}/followers`} className="hover:underline">
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
          <Link
            href={`/cosplay/${user.username}`}
            className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Camera className="h-4 w-4" />
            코스어 프로필 보기
          </Link>
        ) : isSelf ? (
          <Link
            href="/cosplay/apply"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Camera className="h-4 w-4" />
            코스어 신청하기
          </Link>
        ) : null}
      </div>
    </div>
  );
}
