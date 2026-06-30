"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mailbox } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { shouldHideNativeComposeFab } from "@/lib/native-app-shell";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { scaleIn, springSnappy } from "@/lib/motion-presets";

export function NativeAppComposeFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  if (!session?.user) return null;
  if (shouldHideNativeComposeFab(pathname)) return null;

  return (
    <motion.div
      className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-4 z-50"
      variants={scaleIn}
      initial={reduced ? false : "hidden"}
      animate={reduced ? undefined : "show"}
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Link
          href={buildAptMailboxUrl()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95"
          aria-label="우편함"
        >
          <motion.span
            className="flex items-center justify-center"
            whileTap={reduced ? undefined : { scale: 0.9 }}
            whileHover={reduced ? undefined : { scale: 1.06 }}
            transition={springSnappy}
          >
            <Mailbox className="h-6 w-6" />
          </motion.span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
