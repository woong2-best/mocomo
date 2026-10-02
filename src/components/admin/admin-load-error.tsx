import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Button } from "@/components/ui/button";

export function AdminLoadError({
  message = t("admin.s1j8wfgc"),
}: {
  message?: string;
}) {
  return (
    <AdminPageChrome maxWidth="lg">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">{t("avatar.sxdc06c")}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin">{t("admin.s1jych7o")}</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/">{t("events.swcstk")}</Link>
          </Button>
        </div>
      </div>
    </AdminPageChrome>
  );
}
