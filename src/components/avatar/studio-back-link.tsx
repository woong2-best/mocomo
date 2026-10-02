import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function StudioBackLink() {
  return (
    <Link
      href="/live/studio"
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-folk-cobalt transition-colors mb-2"
    >
      <ChevronLeft className="h-4 w-4" />
      {t("nav.liveStudio")}
    </Link>
  );
}
