"use client";

import { Plus } from "lucide-react";
import { useCompose } from "@/components/compose/compose-provider";
import { ProfileSortControls } from "@/components/profile/profile-feed-controls";
import { useSuspendedAccount } from "@/hooks/use-suspended-account";
import { Button } from "@/components/ui/button";

/** Sort + Create — opens the unified compose sheet (글쓰기). */
export function ProfileHeaderFeedActions({ isSelf }: { isSelf: boolean }) {
  const { openCompose } = useCompose();
  const { suspended, blockAction } = useSuspendedAccount();

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <ProfileSortControls />
      {isSelf ? (
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 gap-1 rounded-full px-3 shadow-sm"
          disabled={suspended}
          onClick={() => {
            if (blockAction("post")) return;
            openCompose();
          }}
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      ) : null}
    </div>
  );
}
