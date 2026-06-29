"use client";

import Link from "next/link";
import { Mailbox } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { shouldHideNativeComposeFab } from "@/lib/native-app-shell";

export function NativeAppComposeFab() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;
  if (shouldHideNativeComposeFab(pathname)) return null;

  return (
    <Link
      href={buildAptMailboxUrl()}
      className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 active:scale-95 transition-transform"
      aria-label="우편함"
    >
      <Mailbox className="h-6 w-6" />
    </Link>
  );
}
