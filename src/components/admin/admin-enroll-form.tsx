"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  adminEnrollmentStatusAction,
  adminPasskeyRegisterOptionsAction,
  adminPasskeyRegisterVerifyAction,
  adminRecoveryGenerateAction,
  adminTotpBeginAction,
  adminTotpVerifyAction,
  adminMfaAfterPasswordAction,
} from "@/actions/admin-security";

type Phase = "passkey" | "totp" | "recovery" | "done";

export function AdminEnrollForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("passkey");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    void (async () => {
      const status = await adminEnrollmentStatusAction();
      if ("status" in status && status.status) {
        if (status.status.complete) {
          setPhase("done");
          return;
        }
        if (!status.status.hasPasskey) setPhase("passkey");
        else if (!status.status.totpEnabled) setPhase("totp");
        else if (!status.status.hasRecoveryCodes) setPhase("recovery");
        else setPhase("done");
      }
    })();
  }, []);

  async function registerPasskey() {
    setLoading(true);
    setError(null);
    const options = await adminPasskeyRegisterOptionsAction();
    if ("error" in options && options.error) {
      setLoading(false);
      setError(options.error);
      return;
    }
    try {
      const attestation = await startRegistration(options as Parameters<typeof startRegistration>[0]);
      const result = await adminPasskeyRegisterVerifyAction(attestation, "Primary");
      setLoading(false);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setPhase("totp");
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Passkey 등록이 취소되었습니다.");
    }
  }

  async function beginTotp() {
    setLoading(true);
    setError(null);
    const begun = await adminTotpBeginAction();
    setLoading(false);
    if ("error" in begun && begun.error) {
      setError(begun.error);
      return;
    }
    if ("otpauthUrl" in begun && begun.otpauthUrl) {
      setSecret(begun.secretBase32 ?? null);
      const url = await QRCode.toDataURL(begun.otpauthUrl, { width: 220, margin: 1 });
      setQrDataUrl(url);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await adminTotpVerifyAction(totpCode);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPhase("recovery");
  }

  async function generateRecovery() {
    setLoading(true);
    setError(null);
    const result = await adminRecoveryGenerateAction();
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("codes" in result && result.codes) {
      setRecoveryCodes(result.codes);
      setPhase("done");
    }
  }

  async function finish() {
    setLoading(true);
    // 등록 완료 후 Passkey → TOTP 로그인 계속
    const advanced = await adminMfaAfterPasswordAction();
    setLoading(false);
    if ("error" in advanced && advanced.error) {
      router.replace("/admin/login");
      return;
    }
    // stage=pw 쿠키가 있으므로 로그인 페이지가 Passkey 단계부터 이어감
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <BrandLogo className="h-10 w-auto" />
          </div>
          <h1 className="text-xl font-bold">관리자 보안 등록</h1>
          <p className="text-sm text-muted-foreground">
            Passkey와 Authenticator 등록을 완료해야 관리자 페이지에 접근할 수 있습니다.
          </p>
        </div>

        {phase === "passkey" ? (
          <div className="space-y-3">
            <h2 className="font-semibold">1. Passkey 등록</h2>
            <p className="text-sm text-muted-foreground">
              Windows Hello / Face ID / Touch ID / 보안 키를 등록합니다.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading} onClick={registerPasskey}>
              {loading ? "등록 중…" : "Passkey 등록"}
            </Button>
          </div>
        ) : null}

        {phase === "totp" ? (
          <div className="space-y-3">
            <h2 className="font-semibold">2. Authenticator 등록</h2>
            <p className="text-sm text-muted-foreground">
              Google Authenticator, Microsoft Authenticator, Authy 등으로 QR을 스캔하세요.
            </p>
            {!qrDataUrl ? (
              <Button className="w-full" disabled={loading} onClick={beginTotp}>
                QR 코드 생성
              </Button>
            ) : (
              <form onSubmit={verifyTotp} className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="TOTP QR" className="mx-auto rounded-lg border" />
                {secret ? (
                  <p className="break-all text-center font-mono text-xs text-muted-foreground">
                    수동 입력: {secret}
                  </p>
                ) : null}
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="앱의 6자리 코드"
                  className="text-center font-mono tracking-widest"
                  required
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                  확인
                </Button>
              </form>
            )}
            {error && !qrDataUrl ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}

        {phase === "recovery" ? (
          <div className="space-y-3">
            <h2 className="font-semibold">3. Recovery Code 생성</h2>
            <p className="text-sm text-muted-foreground">
              Authenticator 분실 시 사용할 1회용 코드 10개를 생성합니다. 안전한 곳에 보관하세요.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading} onClick={generateRecovery}>
              Recovery Code 생성
            </Button>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3">
            <h2 className="font-semibold">등록 완료</h2>
            {recoveryCodes ? (
              <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-6">
                {recoveryCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              이제 Passkey + TOTP로 관리자 로그인을 완료하세요.
            </p>
            <Button className="w-full" disabled={loading} onClick={finish}>
              로그인 계속하기
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
