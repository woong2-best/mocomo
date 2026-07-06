import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { splitStoredBirthDate } from "@/lib/birth-date";
import type { CosplayGalleryPhoto } from "@/components/profile/cosplay-gallery-settings";
import {
  usernameChangeResetAt,
  usernameChangeWindowStart,
  usernameChangesRemaining,
} from "@/lib/username-policy";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/profile");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      cosplayerProfile: {
        include: {
          photos: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!user) redirect("/auth/signin");

  const sns = (user.profile?.snsLinks ?? {}) as { location?: string; website?: string };
  const birth = splitStoredBirthDate(user.birthDate);
  const recentUsernameChanges = await db.usernameChangeLog.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: usernameChangeWindowStart() },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const resetAt = usernameChangeResetAt(recentUsernameChanges);

  const cosplayPhotos: CosplayGalleryPhoto[] =
    user.cosplayerProfile?.photos.map((p) => ({
      id: p.id,
      url: p.url,
      character: p.character,
      series: p.series,
    })) ?? [];

  return (
    <ProfileSettingsForm
      initial={{
        username: user.username,
        name: user.name ?? "",
        image: user.image ?? "",
        bio: user.profile?.bio ?? "",
        bannerUrl: user.profile?.bannerUrl ?? "",
        mainCharacter: user.profile?.mainCharacter ?? "",
        favoriteTags: user.profile?.favoriteTags?.join(", ") ?? "",
        location: sns.location ?? "",
        website: sns.website ?? "",
        showNsfw: user.showNsfw,
        birthYear: birth.year,
        birthMonth: birth.month,
        birthDay: birth.day,
        showBirthdayOnProfile: user.profile?.showBirthdayOnProfile ?? false,
        usernameChangesRemaining: usernameChangesRemaining(recentUsernameChanges.length),
        usernameChangeResetAt: resetAt?.toISOString() ?? null,
      }}
      cosplayerProfile={
        user.cosplayerProfile
          ? { username: user.username, photos: cosplayPhotos }
          : null
      }
    />
  );
}
