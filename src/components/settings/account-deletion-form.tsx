"use client";

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
      setError(result.error);
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
          <p className="text-sm font-medium text-destructive">회원 탈퇴</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            탈퇴하면 계정이 즉시 비활성화되고 게시물·댓글·좋아요 등 공개 흔적은 사라집니다. DM
            기록은 상대방 화면에 &quot;탈퇴한 사용자&quot;로 남을 수 있습니다.{" "}
            <strong>{ACCOUNT_RECOVERY_DAYS}일</strong> 이내 로그인하면 탈퇴를 취소할 수 있으며,
            기간이 지나면 계정과 데이터가 영구 삭제됩니다.
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
                탈퇴 즉시 피드·프로필의 게시물과 댓글, 좋아요, 팔로우 관계가 정리됩니다.
              </span>
              <span className="block">
                <strong>{ACCOUNT_RECOVERY_DAYS}일</strong> 이내 같은 계정으로 로그인하면 탈퇴를
                취소하고 계정을 복구할 수 있습니다.
              </span>
              <span className="block text-destructive">
                {ACCOUNT_RECOVERY_DAYS}일이 지나면 계정과 데이터가 영구 삭제되며, 아이디가 다시
                사용 가능해집니다.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">
                확인을 위해 아이디 <strong>{username}</strong>을(를) 입력하세요
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
            ) : (
              <p className="text-xs text-muted-foreground">
                Google·Discord 등 소셜 가입 계정은 비밀번호 확인 없이 아이디와 Delete 입력만
                필요합니다.
              </p>
            )}

            <label className="block text-sm space-y-1.5">
              <span className="text-muted-foreground">
                확인을 위해 <strong>{ACCOUNT_DELETE_CONFIRM_TEXT}</strong>을(를) 입력하세요
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
              disabled={loading || !canSubmit}
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
