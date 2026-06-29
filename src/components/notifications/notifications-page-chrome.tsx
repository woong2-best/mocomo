"use client";

import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function NotificationsPageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div className={cn("p-4 lg:p-6 max-w-2xl mx-auto space-y-4", isNativeApp && "pb-native-fab")}>
      <FolkSectionTitle icon="moon" className={cn(isNativeApp && "sr-only")}>
        알림
      </FolkSectionTitle>
      <p className={cn("text-sm text-folk-forest/80 font-medium -mt-1", isNativeApp && "sr-only")}>
        좋아요, 댓글, 팔로우, 쪽지, 라이브, 후원, 중고거래 등 활동 알림
      </p>
      {children}
    </div>
  );
}
