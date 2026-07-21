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
      className="!max-w-none !w-full !mx-0 !p-0 min-h-screen border-x border-border/40"
    >
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <ProfileTabProvider username={username}>
          <ProfileHeaderAsync username={username} />
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] min-w-0">
            <div className="min-w-0">{children}</div>
            <div className="border-t border-border/40 p-4 lg:hidden">
              <Suspense
                fallback={<div className="h-32 animate-pulse rounded-xl bg-muted/40" />}
              >
                <ProfilePageMinigame username={username} />
              </Suspense>
            </div>
            <Suspense
              fallback={
                <aside className="hidden border-l border-border/40 p-4 lg:block">
                  <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
                </aside>
              }
            >
              <aside className="hidden min-w-0 space-y-4 border-l border-border/40 p-4 lg:block">
                <ProfilePageWebtoons username={username} />
                <ProfilePageMinigame username={username} />
              </aside>
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
