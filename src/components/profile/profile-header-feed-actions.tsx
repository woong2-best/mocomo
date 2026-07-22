"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ProfileCreatePanel } from "@/components/profile/profile-create-panel";
import { ProfileSortControls } from "@/components/profile/profile-feed-controls";
import { useSuspendedAccount } from "@/hooks/use-suspended-account";
import { Button } from "@/components/ui/button";

/** Sort + Create — aligned on the following/followers row. */
export function ProfileHeaderFeedActions({ isSelf }: { isSelf: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { suspended, blockAction } = useSuspendedAccount();

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <ProfileSortControls />
        {isSelf ? (
          <Button
            type="button"
            size="sm"
            variant={createOpen ? "secondary" : "default"}
            className="h-8 shrink-0 gap-1 rounded-full px-3 shadow-sm"
            disabled={suspended}
            onClick={() => {
              if (blockAction("post")) return;
              setCreateOpen((v) => !v);
            }}
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        ) : null}
      </div>
      {isSelf ? (
        <ProfileCreatePanel open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </>
  );
}
