import type { ReactNode } from "react";

export function PostsChannelShell({
  children,
}: {
  communityId: string;
  children: ReactNode;
}) {
  return <div className="flex flex-col gap-3">{children}</div>;
}
