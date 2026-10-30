"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userDisplayName } from "@/lib/user-public-select";
import { cn } from "@/lib/utils";

export type MentionSuggestUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export function MentionSuggestList({
  users,
  activeIndex,
  onSelect,
  variant = "dropdown",
}: {
  users: MentionSuggestUser[];
  activeIndex: number;
  onSelect: (username: string) => void;
  variant?: "dropdown" | "inline";
}) {
  if (users.length === 0) return null;
  return (
    <ul
      role="listbox"
      className={cn(
        variant === "dropdown"
          ? "absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg"
          : "absolute bottom-full z-50 mb-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg"
      )}
    >
      {users.map((user, index) => (
        <li key={user.id} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70",
              index === activeIndex && "bg-muted/70"
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(user.username)}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback className="text-xs">
                {user.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{userDisplayName(user)}</span>
              <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
