"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Radio, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/explore", icon: Compass, label: "탐색" },
  { href: "/live", icon: Radio, label: "라이브" },
  { href: "/messages", icon: MessageCircle, label: "메시지" },
  { href: "/my-page", icon: User, label: "MY" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px]",
                active ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
