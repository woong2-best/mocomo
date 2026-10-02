"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewMessageCompose } from "@/components/messages/new-message-compose";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { ChevronLeft } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-0 animate-pulse bg-muted/20" />}>
      <NewMessagePageInner />
    </Suspense>
  );
}

function NewMessagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isNativeApp } = useClientPlatform();
  const { t } = useLocale();

  useEffect(() => {
    if (isNativeApp) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const redirect = () => {
      if (!mq.matches) return;
      const q = searchParams.toString();
      router.replace(q ? `/messages?${q}` : "/messages");
    };
    redirect();
    mq.addEventListener("change", redirect);
    return () => mq.removeEventListener("change", redirect);
  }, [isNativeApp, router, searchParams]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-border/60 shrink-0">
        <Link href="/messages" className="p-2 rounded-full hover:bg-muted/80">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {!isNativeApp && <h1 className="font-bold text-lg">{t("messages.newTitle")}</h1>}
        {isNativeApp && <h1 className="sr-only">{t("messages.newTitle")}</h1>}
      </header>
      <NewMessageCompose />
    </div>
  );
}
