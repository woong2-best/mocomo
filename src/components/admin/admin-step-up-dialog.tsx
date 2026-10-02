"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminPasskeyAuthOptionsAction,
  adminStepUpCompleteAction,
} from "@/actions/admin-security";

/**
 * 중요 작업 전 Passkey + TOTP 재인증 모달.
 * error === "ADMIN_STEPUP_REQUIRED" 일 때 표시 후 onVerified 재시도.
 */
export function AdminStepUpDialog({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyDone, setPasskeyDone] = useState<Awaited<
    ReturnType<typeof startAuthentication>
  > | null>(null);

  if (!open) return null;

  async function runPasskey() {
    setLoading(true);
    setError(null);
    const opts = await adminPasskeyAuthOptionsAction({ stepUp: true });
    if ("error" in opts && opts.error) {
      setLoading(false);
      setError(errorText(opts.error));
      return;
    }
    if (!("options" in opts) || !opts.options) {
      setLoading(false);
      setError(t("admin.passkey_9"));
      return;
    }
    try {
      const assertion = await startAuthentication(opts.options);
      setPasskeyDone(assertion);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : t("admin.passkey_10"));
    }
  }

  async function submit() {
    if (!passkeyDone) {
      setError(t("admin.passkey_11"));
      return;
    }
    setLoading(true);
    const result = await adminStepUpCompleteAction(passkeyDone, code);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(errorText(result.error));
      return;
    }
    onVerified();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{t("admin.s1o9j28y")}</h2>
        <p className="text-sm text-muted-foreground">
          이 작업은 Passkey와 Authenticator 코드를 다시 확인해야 합니다.
        </p>
        <Button className="w-full" disabled={loading} onClick={runPasskey}>
          {passkeyDone ? t("admin.passkey_12") : t("admin.1_passkey_2")}
        </Button>
        <Input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("admin.2_totp_6")}
          className="text-center font-mono tracking-widest"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            className="flex-1"
            disabled={loading || !passkeyDone || code.length !== 6}
            onClick={submit}
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
