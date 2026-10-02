"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestAccountDeletion } from "@/actions/account";
import { ACCOUNT_RECOVERY_DAYS, ACCOUNT_DELETE_CONFIRM_TEXT } from "@/lib/account-deletion";
import { Loader2 } from "lucide-react";

type Props = {
  username: string;
  hasPassword: boolean;
};

export function AccountDeletionForm({ username, hasPassword }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setConfirmUsername("");
    setPassword("");
    setConfirmDelete("");
    setReason("");
    setError("");
  }

  const canSubmit =
    confirmUsername.trim().length > 0 &&
    confirmDelete.trim() === ACCOUNT_DELETE_CONFIRM_TEXT &&
    (!hasPassword || password.trim().length > 0);

  async function handleDelete() {
    setLoading(true);
    setError("");
    const result = await requestAccountDeletion({
      confirmUsername,
      confirmDelete,
      password: hasPassword ? password : undefined,
      reason: reason || undefined,
    });
    setLoading(false);

    if ("error" in result && result.error) {
      setError(errorText(result.error));
      return;
    }

    setOpen(false);
    resetForm();
    void performWebSignOut({
      callbackUrl: "/auth/signin?recovered=0&message=account_deleted",
    });
  }

  return (
    <>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-destructive">{t("settings.sbluya0")}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("settings.accountDeletionIntro")}{" "}
            <strong>
              {t("settings.accountDeletionDaysStrong", {
                days: String(ACCOUNT_RECOVERY_DAYS),
              })}
            </strong>{" "}
            {t("settings.s14hvwwb")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          {t("settings.sbluya0")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.s16d2n69")}</DialogTitle>
            <DialogDescription className="text-left space-y-2 pt-1">
              <span className="block">
                {t("settings.sdde07k")}
              </span>
              <span className="block">
                <strong>
                  {t("settings.accountDeletionDaysStrong", {
                    days: String(ACCOUNT_RECOVERY_DAYS),
                  })}
                </strong>{" "}
                {t("settings.sion8xg")}
              </span>
              <span className="block text-destructive">
                {t("settings.accountDeletionPermanent", {
                  days: String(ACCOUNT_RECOVERY_DAYS),
                })}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">
                {t("settings.s1lpj42b")} <strong>{username}</strong>{t("settings.sdrr2g5")}
              </span>
              <Input
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={username}
                autoComplete="off"
                disabled={loading}
              />
            </label>

            {hasPassword ? (
              <label className="block text-sm space-y-1.5">
                <span className="text-muted-foreground">{t("auth.passwordSimple")}</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("settings.google_discord_delete")}
              </p>
            )}

            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">
                {t("settings.s5gmikv")} <strong>{ACCOUNT_DELETE_CONFIRM_TEXT}</strong>{t("settings.sdrr2g5")}
              </span>
              <Input
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder={ACCOUNT_DELETE_CONFIRM_TEXT}
                autoComplete="off"
                disabled={loading}
              />
            </label>

            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">{t("settings.s1f3m9p8")}</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("settings.s1431bo0")}
                maxLength={500}
                disabled={loading}
              />
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("toast.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading || !canSubmit}
              onClick={handleDelete}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("post.menu.blockReportSubmitting")}
                </>
              ) : (
                t("settings.sr7s6is")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
