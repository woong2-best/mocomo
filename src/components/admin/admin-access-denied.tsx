import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminAccessDenied() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">{t("admin.sudsvr1")}</p>
        <p className="text-sm text-muted-foreground">
          이 페이지는 운영자 계정으로 로그인한 경우에만 열 수 있습니다.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin">{t("lib.admin.sne8dac")}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">{t("events.swcstk")}</Link>
        </Button>
      </div>
    </div>
  );
}
