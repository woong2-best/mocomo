import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getContactSettings } from "@/lib/contact-audience";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageContactSettingsForm } from "@/components/settings/message-contact-settings-form";

export default async function MessageSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/messages");

  const settings = await getContactSettings(session.user.id);

  return (
    <SettingsPageChrome>
      <div className="flex items-center gap-2">
        <Link
          href="/messages"
          className="p-2 -ml-2 rounded-full hover:bg-muted/80"
          aria-label="메시지"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">메시지 설정</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>메시지 · 통화</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageContactSettingsForm initial={settings} />
        </CardContent>
      </Card>
    </SettingsPageChrome>
  );
}
