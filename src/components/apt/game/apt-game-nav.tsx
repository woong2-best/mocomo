"use client";

import { memo } from "react";
import { Home, LayoutGrid, MoreHorizontal, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";
import type { AptGameTab } from "@/lib/apt/game/types";

const TABS: { id: AptGameTab; label: string; icon: typeof Home }[] = [
  { id: "shop", label: "상점", icon: ShoppingBag },
  { id: "furniture", label: "가구", icon: LayoutGrid },
  { id: "home", label: "홈", icon: Home },
  { id: "friends", label: "친구", icon: Users },
  { id: "more", label: "더보기", icon: MoreHorizontal },
];

function AptGameNavInner() {
  const { activeTab, setActiveTab, editMode } = useAptGameRequired();
  if (editMode) return null;

  return (
    <nav className="apt-game-nav pointer-events-auto absolute inset-x-0 bottom-0 z-[90] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div className="apt-game-nav-inner mx-auto flex max-w-md items-end justify-around rounded-[1.5rem] px-1 py-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const isHome = id === "home";
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 transition active:scale-95",
                isHome && active && "-mt-4 apt-game-nav-home px-3 py-2.5 text-white",
                !isHome && active && "bg-amber-100/90 text-[#5c4033]",
                !active && "text-[#a08968]"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isHome && active && "h-6 w-6",
                  active && !isHome && "text-amber-700"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn("text-[9px] font-bold", isHome && active && "text-[10px] font-black")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const AptGameNav = memo(AptGameNavInner);
