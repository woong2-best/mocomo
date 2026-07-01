import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUserConnections } from "@/actions/user-connections";
import { UserConnectionsHeader } from "@/components/profile/user-connections-header";
import { UserConnectionRow } from "@/components/profile/user-connection-row";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import {
  CONNECTION_EMPTY,
  parseConnectionTab,
  type ConnectionTab,
} from "@/lib/user-connections";

function tabKind(tab: ConnectionTab): "followers" | "following" | "subscribers" | "subscriptions" {
  if (tab === "following") return "following";
  if (tab === "subscribers") return "subscribers";
  if (tab === "subscriptions") return "subscriptions";
  return "followers";
}

export async function UserConnectionsPage({
  username,
  tab,
}: {
  username: string;
  tab: string | undefined;
}) {
  const activeTab = parseConnectionTab(tab);
  const data = await getUserConnections(username, activeTab);
  if (!data) notFound();

  const empty = CONNECTION_EMPTY[activeTab];

  return (
    <AppPageChrome maxWidth="2xl" className="!p-0">
      <Suspense fallback={null}>
        <UserConnectionsHeader
          username={data.profile.username}
          displayName={data.profile.displayName}
          followerCount={data.profile.followerCount}
          activeTab={activeTab}
        />
      </Suspense>

      {data.users.length === 0 ? (
        <div className="px-6 py-16 max-w-sm">
          <h2 className="text-[31px] font-extrabold leading-tight tracking-tight">{empty.title}</h2>
          <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">{empty.description}</p>
          {activeTab === "known" && !data.viewerId && (
            <p className="mt-4 text-sm">
              <a href="/auth/signin" className="text-primary hover:underline">
                로그인
              </a>
              하면 아는 팔로워를 볼 수 있습니다.
            </p>
          )}
        </div>
      ) : (
        <ul>
          {data.users.map((user) => (
            <UserConnectionRow
              key={user.id}
              user={user}
              viewerId={data.viewerId}
              profileUserId={data.profile.id}
              tabKind={tabKind(activeTab)}
            />
          ))}
        </ul>
      )}
    </AppPageChrome>
  );
}
