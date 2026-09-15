import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCreateForm } from "@/components/events/event-create-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPurchasedMoco } from "@/lib/settlement-moco/balance";
import { isOperatorIdentity } from "@/lib/operator-config";
import { SPONSORED_AD_MOCO_PER_DAY } from "@/lib/sponsored-ad/constants";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; paid?: string; edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/events/new");
  }

  const { eventId, paid, edit } = await searchParams;
  const purchasedMoco = await getPurchasedMoco(session.user.id);
  const isOperator = isOperatorIdentity({
    username: session.user.username ?? "",
    role: session.user.role ?? "USER",
    email: session.user.email,
  });

  let paidEventId: string | null = null;
  let paidLinkUrl: string | null = null;
  let paidImageUrl: string | null = null;

  const lookupId = edit || (paid === "1" ? eventId : null);
  if (lookupId) {
    const event = await db.event.findUnique({
      where: { id: lookupId },
      select: {
        id: true,
        createdById: true,
        registrationFeePaid: true,
        linkUrl: true,
        imageUrl: true,
      },
    });
    if (event?.createdById === session.user.id && event.registrationFeePaid) {
      paidEventId = event.id;
      paidLinkUrl = event.linkUrl;
      paidImageUrl = event.imageUrl;
    }
  }

  return (
    <AppPageChrome maxWidth="5xl" spacing="sm">
      <NativePageTitle>
        <div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              홈
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">광고 등록</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            이미지·링크만 등록 · 24시간(1일)당 {SPONSORED_AD_MOCO_PER_DAY} MOCO · 등록 시 선차감 ·
            클릭 시 설정 링크로 이동
          </p>
        </div>
      </NativePageTitle>

      <EventCreateForm
        purchasedMoco={purchasedMoco}
        isOperator={isOperator}
        paidEventId={paidEventId}
        paidLinkUrl={paidLinkUrl}
        paidImageUrl={paidImageUrl}
      />
    </AppPageChrome>
  );
}
