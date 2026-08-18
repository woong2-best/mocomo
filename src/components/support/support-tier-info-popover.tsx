"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportTierTable } from "@/components/support/support-tier-table";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export function SupportTierInfoPopover({
  children,
  align = "start",
  side = "bottom",
  className,
}: Props) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        collisionPadding={12}
        className={cn(
          "z-[300] w-[min(92vw,24rem)] max-h-[min(70vh,32rem)] overflow-y-auto p-4",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold mb-3">광석 등급 안내</p>
        <SupportTierTable />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
