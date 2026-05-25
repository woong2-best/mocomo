import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/profile");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) redirect("/auth/signin");

  const sns = (user.profile?.snsLinks ?? {}) as { location?: string; website?: string };

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
      }}
    />
  );
}
