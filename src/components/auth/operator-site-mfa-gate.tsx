"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  adminMfaAfterPasswordAction,
  adminMfaStageAction,
  adminPasskeyAuthOptionsAction,
  adminPasskeyAuthVerifyAction,
  adminTotpAuthVerifyAction,
} from "@/actions/admin-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "passkey" | "totp";

const EXEMPT_PREFIXES = [
  "/auth/",
  "/admin/login",
  "/admin/enroll",
  "/admin/forbidden",
  "/api/",
  "/_next/",
];

function isExemptPath(pathname: string) {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/enroll")) return true;
  return EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function OperatorSiteMfaGate() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const session = useSession();
  const isOperator = Boolean(session.data?.user?.isOperator);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("passkey");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armedRef = useRef(false);

  const refreshStage = useCallback(async () => {
    if (!isOperator || isExemptPath(pathname)) {
      setOpen(false);
      return;
    }
    const { stage } = await adminMfaStageAction();
    if (stage === "ok") {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (stage === "pk") setStep("totp");
    else setStep("passkey");
  }, [isOperator, pathname]);

  useEffect(() => {
    void refreshStage();
  }, [refreshStage, session.data?.user?.id]);

  useEffect(() => {
    if (!isOperator) {
      armedRef.current = false;
      return;
    }
    if (isExemptPath(pathname)) {
      setOpen(false);
      return;
    }
    void refreshStage();
  }, [isOperator, pathname, refreshStage]);

  useEffect(() => {
    if (!isOperator || armedRef.current) return;
    void (async () => {
      const { stage } = await adminMfaStageAction();
      if (stage !== null) return;
      armedRef.current = true;
      const res = await adminMfaAfterPasswordAction();
      if ("error" in res && res.error) {
        setError(res.error);
        setOpen(true);
        return;
      }
      if ("next" in res && res.next === "enroll") {
        router.replace("/admin/enroll");
        return;
      }
      await refreshStage();
    })();
  }, [isOperator, router, refreshStage, session.data?.user?.id]);

  async function runPasskey() {
    setLoading(true);
    setError(null);
    try {
      const opts = await adminPasskeyAuthOptionsAction();
      if ("error" in opts && opts.error) {
        setError(opts.error);
        return;
      }
      if (!("options" in opts) || !opts.options) {
        setError("Passkey 옵션을 불러오지 못했습니다.");
        return;
      }
      const assertion = await startAuthentication(opts.options);
      const verified = await adminPasskeyAuthVerifyAction(assertion);
      if ("error" in verified && verified.error) {
        setError(verified.error);
        return;
      }
      setStep("totp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey 인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function runTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await adminTotpAuthVerifyAction(code.trim(), { useRecovery });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-mfa-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="operator-mfa-title" className="text-lg font-black tracking-tight">
          관리자 추가 인증
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          운영자 계정은 사이트 이용 전 Passkey와 OTP(TOTP) 인증이 필요합니다.
        </p>

        {error ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === "passkey" ? (
          <div className="mt-5 space-y-3">
            <Button type="button" className="w-full" disabled={loading} onClick={() => void runPasskey()}>
              {loading ? "인증 중…" : "Passkey로 계속"}
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <a href="/admin/enroll">보안 등록(Passkey·OTP) 설정</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void runTotp(e)} className="mt-5 space-y-3">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={useRecovery ? "Recovery code" : "6자리 OTP"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useRecovery}
                onChange={(e) => setUseRecovery(e.target.checked)}
              />
              Recovery code 사용
            </label>
            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? "확인 중…" : "OTP 확인"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
