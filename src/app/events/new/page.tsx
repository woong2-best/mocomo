import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCreateForm } from "@/components/events/event-create-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  EVENT_REGISTRATION_FEE_PER_DAY_KRW,
  EVENT_REGISTRATION_MAX_DAYS,
  EVENT_REGISTRATION_MAX_FEE_KRW,
} from "@/lib/event-registration";

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
    <AppPageChrome maxWidth="5xl" spacing="sm">
      <NativePageTitle>
        <div>
          <Link href="/events">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              이벤트
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            이벤트 등록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록비 하루 {EVENT_REGISTRATION_FEE_PER_DAY_KRW.toLocaleString()}원 (최대{" "}
            {EVENT_REGISTRATION_MAX_DAYS}일 · {EVENT_REGISTRATION_MAX_FEE_KRW.toLocaleString()}
            원) · 결제 후 목록에 공개됩니다
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
