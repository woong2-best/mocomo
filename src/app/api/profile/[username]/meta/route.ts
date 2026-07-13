import { NextRequest, NextResponse } from "next/server";
import { getProfileHeader, getViewerCreatorSubscription } from "@/actions/profile-page";
import { creatorSubscriptionPriceForUser } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const header = await getProfileHeader(username);
  if (!header) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(header.user.creatorSubscriptionPriceKrw);
  const profileBlocked =
    !header.isSelf &&
    (header.relationship.blockedByViewer || header.relationship.blockedViewer);
  const blockedEmptyMessage = header.relationship.blockedByViewer
    ? `@${header.user.username} 님을 차단했습니다. 게시물을 볼 수 없습니다.`
    : `@${header.user.username} 님이 회원님을 차단했습니다.`;

  const viewerSub = header.isSelf
    ? { subscribed: false as const }
    : await getViewerCreatorSubscription(header.user.id);

  return NextResponse.json(
    {
      isSelf: header.isSelf,
      paymentsEnabled,
      subscriptionPriceKrw,
      authorId: header.user.id,
      subscribed: "subscribed" in viewerSub ? viewerSub.subscribed : false,
      profileBlocked,
      blockedEmptyMessage,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
