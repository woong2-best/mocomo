import { Globe, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** MoCoMo share trigger — globe (replaces 3-node Share2). */
export function ShareGlobeIcon({ className, strokeWidth = 1.5, ...props }: LucideProps) {
  return (
    <Globe
      className={cn("pointer-events-none shrink-0", className)}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
