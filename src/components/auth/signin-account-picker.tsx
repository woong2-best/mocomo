"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  listSavedAccounts,
  removeSavedAccount,
  switchToAccount,
  type SavedAccount,
} from "@/lib/account-switch/client";
import { setAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { signOutForAddAccount } from "@/lib/account-switch/sign-out-client";
import { cn } from "@/lib/utils";

export function SignInAccountPicker({
  loggedOutUserId,
  onShowSignInForm,
}: {
  loggedOutUserId?: string | null;
  onShowSignInForm?: () => void;
}) {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refreshList = useCallback(() => {
    setAccounts(listSavedAccounts());
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  if (status === "loading") return null;
  if (session?.user?.id) return null;
  if (accounts.length === 0) return null;

  async function handleSwitch(account: SavedAccount) {
    setBusyId(account.userId);
    setError("");
    const result = await switchToAccount(account);
    setBusyId(null);
    if (!result.ok) {
      setError(t("accountSwitch.switchFailed"));
      refreshList();
      return;
    }
    window.location.href = DEFAULT_LANDING_PATH;
  }

  async function handleAddExisting() {
    setError("");
    setAddAccountFlowCookie();
    await signOutForAddAccount();
    window.location.href = "/auth/signin?addAccount=1";
  }

  async function handleCreateNew() {
    setError("");
    setAddAccountFlowCookie();
    await signOutForAddAccount();
    window.location.href = "/auth/signup/apply?addAccount=1";
  }

  function handleRemove(account: SavedAccount, e: React.MouseEvent) {
    e.stopPropagation();
    removeSavedAccount(account.userId);
    refreshList();
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">{t("accountSwitch.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("accountSwitch.pickPrompt")}</p>
      </div>

      <ul className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {accounts.map((account) => {
          const isLoggedOut = account.userId === loggedOutUserId;
          const displayName = account.name || account.username;
          return (
            <li key={account.userId} className="border-b border-border/60 last:border-0">
              <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-muted/40 transition-colors">
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
                    {isLoggedOut ? (
                      <span className="block text-xs font-medium text-muted-foreground mt-0.5">
                        {t("accountSwitch.loggedOut")}
                      </span>
                    ) : null}
                  </span>
                  {busyId === account.userId ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                  ) : isLoggedOut ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      {t("accountSwitch.loggedOut")}
                    </span>
                  ) : null}
                </button>
                {busyId !== account.userId && (
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
        })}
      </ul>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="space-y-2">
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
        {onShowSignInForm ? (
          <button
            type="button"
            className="w-full text-sm text-primary hover:underline py-2"
            onClick={onShowSignInForm}
          >
            {t("accountSwitch.useOtherLogin")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
