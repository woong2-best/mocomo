import { getProfileHeader } from "@/actions/profile-page";
import {
  getCreatorSupportSummary,
  getViewerSupportForCreator,
} from "@/actions/support";
import { ProfileSupportBlock } from "@/components/support/profile-support-block";
import { isPaymentsConfigured } from "@/lib/payments";

/** 후원·팁 요약 — 타임라인 다음에 스트리밍 */
export async function ProfileSupportAsync({ username }: { username: string }) {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const [supportSummary, viewerSupport] = await Promise.all([
    getCreatorSupportSummary(header.user.id),
    getViewerSupportForCreator(header.user.id),
  ]);

  return (
    <ProfileSupportBlock
      creatorId={header.user.id}
      username={header.user.username}
      displayName={header.user.name || header.user.username}
      isSelf={header.isSelf}
      summary={supportSummary}
      viewerSupport={viewerSupport}
      profileReceivedTotal={header.user.totalSupportReceived}
      profileReceivedTier={header.user.supportTierReceived}
      paymentsEnabled={isPaymentsConfigured()}
    />
  );
}
