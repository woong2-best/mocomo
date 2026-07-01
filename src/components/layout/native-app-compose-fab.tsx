"use client";

import { motion } from "framer-motion";
import { PenSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCompose } from "@/components/compose/compose-provider";
import { shouldHideNativeComposeFab } from "@/lib/native-app-shell";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { scaleIn, springSnappy } from "@/lib/motion-presets";

export function NativeAppComposeFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { openCompose } = useCompose();
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
        <motion.button
          type="button"
          onClick={() => openCompose()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95"
          aria-label="글쓰기"
          whileTap={reduced ? undefined : { scale: 0.9 }}
          whileHover={reduced ? undefined : { scale: 1.06 }}
          transition={springSnappy}
        >
          <PenSquare className="h-6 w-6" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
