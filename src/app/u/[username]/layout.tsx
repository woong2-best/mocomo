import { Suspense } from "react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { ProfileHeaderAsync } from "@/components/profile/profile-header-async";
import { ProfileMinigameAsync } from "@/components/profile/profile-minigame-async";
import { ProfileTabProvider } from "@/components/profile/profile-tab-context";
import { ProfileWebtoonsAsync } from "@/components/profile/profile-webtoons-async";
import { ProfileHeaderSkeleton } from "@/components/ui/content-skeletons";

export default function UserProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  return (
    <ProfileLayoutShell params={params}>{children}</ProfileLayoutShell>
  );
}

async function ProfileLayoutShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <AppPageChrome
      maxWidth="5xl"
      spacing="none"
      className="!max-w-none !w-full !mx-0 !px-0 !pt-0 min-h-screen border-x border-border/40"
    >
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <ProfileTabProvider username={username}>
          {/* Header + tabs + feed share one full-width column (Twitter-style). */}
          <ProfileHeaderAsync username={username} />
          <div className="min-w-0 w-full">{children}</div>

          {/* Secondary widgets below feed — never reserve an empty side rail */}
          <div className="space-y-4 border-t border-border/40 p-4">
            <Suspense fallback={null}>
              <ProfilePageWebtoons username={username} />
            </Suspense>
            <Suspense fallback={null}>
              <ProfilePageMinigame username={username} />
            </Suspense>
          </div>
        </ProfileTabProvider>
      </Suspense>
    </AppPageChrome>
  );
}

async function ProfilePageWebtoons({ username }: { username: string }) {
  return <ProfileWebtoonsAsync username={username} />;
}

async function ProfilePageMinigame({ username }: { username: string }) {
  return <ProfileMinigameAsync username={username} />;
}
