import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyCreatorSubscriptions } from "@/actions/subscriptions";
import { MySubscriptionsPanel } from "@/components/settings/my-subscriptions-panel";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RECURRING_DONATION_CHECKOUT_NOTICE_KO } from "@/lib/recurring-donation-terms";

export default async function SubscriptionsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/subscriptions");

  const subscriptions = await getMyCreatorSubscriptions();

  return (
    <SettingsPageChrome>
      <div className="space-y-2">
        <Link href="/settings" className="text-sm text-primary hover:underline">
          ← 설정
        </Link>
        <h1 className="text-2xl font-bold">정기 후원 관리</h1>
        <p className="text-sm text-muted-foreground">{RECURRING_DONATION_CHECKOUT_NOTICE_KO}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">구독 중인 크리에이터</CardTitle>
        </CardHeader>
        <CardContent>
          <MySubscriptionsPanel subscriptions={subscriptions} />
        </CardContent>
      </Card>
    </SettingsPageChrome>
  );
}
