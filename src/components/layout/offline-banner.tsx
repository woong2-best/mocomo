"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

export function OfflineBanner({ className }: { className?: string }) {
  const { locale } = useLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 bg-amber-600/95 px-3 py-2 text-center text-xs font-medium text-white",
        className
      )}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {uiText(
        locale,
        "오프라인입니다. 연결되면 자동으로 동기화됩니다.",
        "You're offline. Changes will sync when you're back online."
      )}
    </div>
  );
}
