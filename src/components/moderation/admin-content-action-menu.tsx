"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { operatorModerateContent } from "@/actions/operator-sanctions";
import type { ContentTargetType, ModeratorAction } from "@/lib/operator-sanctions";
import { canModerateContent } from "@/lib/content-moderator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ACTIONS: { id: ModeratorAction; label: string }[] = [
  { id: "CONTENT_REMOVE", label: "Remove this post" },
  { id: "SUSPEND_24H", label: "Suspend account 24 hours" },
  { id: "SUSPEND_3D", label: "Suspend account 3 days" },
  { id: "SUSPEND_5D", label: "Suspend account 5 days" },
  { id: "SUSPEND_PERMANENT", label: "Permanently restrict account" },
];

export function AdminContentActionMenu({
  targetType,
  targetId,
  authorId,
  className,
}: {
  targetType: ContentTargetType;
  targetId: string;
  authorId?: string;
  className?: string;
}) {
  const session = useSession();
  const router = useRouter();
  const user = session.data?.user;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const canShow =
    !!user?.username &&
    !!user.role &&
    canModerateContent({
      username: user.username,
      role: user.role,
      email: user.email,
    }) &&
    user.id !== authorId;

  if (!canShow) return null;

  function run(action: ModeratorAction) {
    if (pending) return;
    setError("");
    startTransition(async () => {
      const res = await operatorModerateContent({ action, targetType, targetId });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Operator moderation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
          {ACTIONS.map((item, index) => (
            <div key={item.id}>
              {index === 1 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={pending}
                className={item.id === "CONTENT_REMOVE" || item.id === "SUSPEND_PERMANENT"
                  ? "text-destructive focus:text-destructive"
                  : undefined}
                onSelect={(e) => {
                  e.preventDefault();
                  run(item.id);
                }}
              >
                {index + 1}. {item.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[10px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
