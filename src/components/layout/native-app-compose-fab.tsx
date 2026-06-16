"use client";

import { PenLine } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCompose } from "@/components/compose/compose-provider";
import { usePathname } from "next/navigation";
import { shouldHideNativeAppNav } from "@/lib/native-app-shell";

export function NativeAppComposeFab() {
  const { data: session } = useSession();
  const { openCompose } = useCompose();
  const pathname = usePathname();

  if (!session?.user) return null;
  if (shouldHideNativeAppNav(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => openCompose()}
      className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 active:scale-95 transition-transform"
      aria-label="글쓰기"
    >
      <PenLine className="h-6 w-6" />
    </button>
  );
}
