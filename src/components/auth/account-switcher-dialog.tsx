"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  exportCurrentAccount,
  listSavedAccounts,
  removeSavedAccount,
  switchToAccount,
  type SavedAccount,
} from "@/lib/account-switch/client";
import { cn } from "@/lib/utils";

export function AccountSwitcherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refreshList = useCallback(() => {
    setAccounts(listSavedAccounts());
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    refreshList();
    if (session?.user?.id) {
      void exportCurrentAccount().finally(refreshList);
    }
  }, [open, session?.user?.id, refreshList]);

  async function handleSwitch(account: SavedAccount) {
    if (account.userId === session?.user?.id) {
      onOpenChange(false);
      return;
    }
    setBusyId(account.userId);
    setError("");
    const result = await switchToAccount(account);
    setBusyId(null);
    if (!result.ok) {
      setError(t("accountSwitch.switchFailed"));
      refreshList();
      return;
    }
    onOpenChange(false);
    window.location.href = DEFAULT_LANDING_PATH;
  }

  async function handleAddExisting() {
    setError("");
    await exportCurrentAccount();
    onOpenChange(false);
    router.push("/auth/signin?addAccount=1");
  }

  function handleCreateNew() {
    void exportCurrentAccount();
    onOpenChange(false);
    router.push("/auth/signup?addAccount=1");
  }

  function handleRemove(account: SavedAccount, e: React.MouseEvent) {
    e.stopPropagation();
    removeSavedAccount(account.userId);
    refreshList();
  }

  const activeId = session?.user?.id;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[260] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[261] mx-auto w-full max-w-lg rounded-t-2xl border border-border bg-background shadow-xl",
            "pb-safe max-h-[85dvh] overflow-y-auto",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          )}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          </div>

          <DialogPrimitive.Title className="px-5 pb-3 text-xl font-bold">
            {t("accountSwitch.title")}
          </DialogPrimitive.Title>

          <ul className="px-2 pb-2">
            {accounts.length === 0 ? (
              <li className="px-3 py-6 text-sm text-muted-foreground text-center">
                {t("accountSwitch.empty")}
              </li>
            ) : (
              accounts.map((account) => {
                const isActive = account.userId === activeId;
                const displayName = account.name || account.username;
                return (
                  <li key={account.userId}>
                    <div className="flex items-center gap-1 rounded-xl px-1 py-0.5 hover:bg-muted/60 transition-colors">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-3 text-left disabled:opacity-50"
                        onClick={() => void handleSwitch(account)}
                      >
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={account.image ?? undefined} />
                          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{displayName}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            @{account.username}
                          </span>
                        </span>
                        {busyId === account.userId ? (
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                        ) : isActive ? (
                          <Check className="h-5 w-5 shrink-0 text-primary" aria-label={t("accountSwitch.current")} />
                        ) : null}
                      </button>
                      {!isActive && busyId !== account.userId && (
                        <button
                          type="button"
                          className="shrink-0 text-xs text-muted-foreground hover:text-destructive px-2 py-2 rounded-lg hover:bg-destructive/10"
                          onClick={(e) => handleRemove(account, e)}
                        >
                          {t("accountSwitch.remove")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {error && <p className="px-5 pb-2 text-sm text-destructive">{error}</p>}

          <div className="border-t border-border/60 p-4 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl h-11 font-semibold"
              onClick={handleCreateNew}
            >
              {t("accountSwitch.createNew")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl h-11 font-semibold"
              onClick={() => void handleAddExisting()}
            >
              {t("accountSwitch.addExisting")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
