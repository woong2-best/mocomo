"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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
import { ACCOUNT_RECOVERY_DAYS } from "@/lib/account-deletion";
import { Loader2 } from "lucide-react";

type Props = {
  username: string;
  hasPassword: boolean;
};

export function AccountDeletionForm({ username, hasPassword }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setConfirmUsername("");
    setPassword("");
    setReason("");
    setError("");
  }

  async function handleDelete() {
    setLoading(true);
    setError("");
    const result = await requestAccountDeletion({
      confirmUsername,
      password: hasPassword ? password : undefined,
      reason: reason || undefined,
    });
    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    resetForm();
    await signOut({ callbackUrl: "/auth/signin?recovered=0&message=account_deleted" });
  }

  return (
    <>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-destructive">회원 탈퇴</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            탈퇴하면 로그인과 모든 기능 이용이 중단됩니다. 게시물·메시지 등 데이터는{" "}
            <strong>{ACCOUNT_RECOVERY_DAYS}일간 보관</strong>되며, 탈퇴 다음 날부터 같은 계정으로
            로그인하면 복구할 수 있습니다. 복구 기간 동안 같은 닉네임으로 새 가입은 할 수 없습니다.
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
          회원 탈퇴
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>정말 탈퇴하시겠습니까?</DialogTitle>
            <DialogDescription className="text-left space-y-2 pt-1">
              <span className="block">
                탈퇴 후 <strong>{ACCOUNT_RECOVERY_DAYS}일</strong> 동안 글·메시지·기록이 그대로
                보관됩니다.
              </span>
              <span className="block">
                <strong>내일부터 {ACCOUNT_RECOVERY_DAYS}일간</strong> 같은 계정으로 로그인하면
                복구할 수 있습니다.
              </span>
              <span className="block text-destructive">
                복구 기간이 지나면 계정과 데이터가 영구 삭제됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">
                확인을 위해 닉네임 <strong>{username}</strong>을(를) 입력하세요
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
                <span className="text-muted-foreground">비밀번호</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>
            ) : null}

            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">탈퇴 사유 (선택)</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="서비스를 떠나는 이유"
                maxLength={500}
                disabled={loading}
              />
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading || confirmUsername.trim().length === 0}
              onClick={handleDelete}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  처리 중…
                </>
              ) : (
                "탈퇴하기"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
