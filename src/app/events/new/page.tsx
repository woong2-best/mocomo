import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <AppPageChrome maxWidth="5xl" spacing="sm" className="bg-[#141826]">
      <NativePageTitle>
        <div>
          <Link href="/events">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1 text-white/50 hover:text-white/80"
            >
              <ChevronLeft className="h-4 w-4" />
              이벤트
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">
            이벤트 등록
          </h1>
          <p className="mt-1 text-sm text-white/40">
            등록비 {EVENT_REGISTRATION_FEE_KRW.toLocaleString()}원 · 결제 후 목록에
            공개됩니다
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
