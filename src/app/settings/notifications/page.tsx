import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { loadNotificationSettings } from "@/actions/notification-settings";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/notifications");

  const settings = await loadNotificationSettings();
  if (!settings) redirect("/auth/signin?callbackUrl=/settings/notifications");

  return (
    <SettingsPageChrome>
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="p-2 -ml-2 rounded-full hover:bg-muted/80"
          aria-label="Back to notifications"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">알림 설정</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>푸시 · 알림 종류</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm initial={settings} />
        </CardContent>
      </Card>
    </SettingsPageChrome>
  );
}
