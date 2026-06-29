import Link from "next/link";
import { ChevronLeft, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCreateForm } from "@/components/events/event-create-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isPaymentsConfigured } from "@/lib/payments";
import { EVENT_REGISTRATION_FEE_KRW } from "@/lib/event-registration";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; paid?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/events/new");
  }

  const { eventId, paid } = await searchParams;
  const paidSuccess = paid === "1" && !!eventId;

  return (
    <AppPageChrome spacing="sm">
      <NativePageTitle>
      <div>
        <Link href="/events">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
            <ChevronLeft className="h-4 w-4" />
            이벤트
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle className="h-7 w-7 text-violet-500" />
          이벤트 추가하기
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          이미지·설명·링크를 작성한 뒤 등록비{" "}
          {EVENT_REGISTRATION_FEE_KRW.toLocaleString()}원을 결제하면 목록에 공개됩니다.
        </p>
      </div>
      </NativePageTitle>

      <EventCreateForm
        paymentsEnabled={isPaymentsConfigured()}
        paidEventId={paidSuccess ? eventId : null}
      />
    </AppPageChrome>
  );
}
