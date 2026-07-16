"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  adminLogoutMfaAction,
  adminMfaAfterPasswordAction,
  adminMfaStageAction,
  adminPasskeyAuthOptionsAction,
  adminPasskeyAuthVerifyAction,
  adminTotpAuthVerifyAction,
} from "@/actions/admin-security";

type Step = "password" | "passkey" | "totp";

const STEPS: { key: Step; label: string }[] = [
  { key: "password", label: "계정" },
  { key: "passkey", label: "Passkey" },
  { key: "totp", label: "TOTP" },
];

function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center justify-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={
                active
                  ? "rounded-full bg-foreground px-2.5 py-1 font-semibold text-background"
                  : done
                    ? "rounded-full bg-emerald-600/15 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-400"
                    : "rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
              }
            >
              {i + 1}. {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="text-muted-foreground/50">→</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function AdminLoginForm({
  callbackUrl,
  errorParam,
  siteUsername,
}: {
  callbackUrl: string;
  errorParam: string | null;
  /** 메인 사이트 세션 표시용 — 관리자 인증을 대체하지 않음 */
  siteUsername: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "forbidden"
      ? "관리자 권한이 없는 계정입니다. 관리자 계정으로 로그인해 주세요."
      : null
  );

  // 중단된 관리자 MFA 단계(쿠키 stage)만 복원. 메인 사이트 로그인만으로는 절대 건너뛰지 않음.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { stage } = await adminMfaStageAction();
      if (cancelled) return;
      if (stage === "ok") {
        router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/admin");
        return;
      }
      if (stage === "pk") setStep("totp");
      else if (stage === "pw") setStep("passkey");
      else setStep("password");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [callbackUrl, router]);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 메인 사이트 세션·이전 MFA 쿠키 전부 초기화 후 관리자 계정으로 재로그인
    try {
      await adminLogoutMfaAction();
    } catch {
      /* ignore */
    }
    try {
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }

    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: "/admin/login",
    });

    if (!res || res.error) {
      setLoading(false);
      setError("로그인에 실패했습니다. 관리자 이메일·아이디와 비밀번호를 확인해 주세요.");
      return;
    }

    const advanced = await adminMfaAfterPasswordAction();
    setLoading(false);
    if ("error" in advanced && advanced.error) {
      setError(advanced.error);
      try {
        await adminLogoutMfaAction();
        await signOut({ redirect: false });
      } catch {
        /* ignore */
      }
      return;
    }

    if ("next" in advanced) {
      if (advanced.next === "enroll") {
        router.replace("/admin/enroll");
        return;
      }
      // passkey 단계로 — trusted device 등으로 건너뛰지 않음
      setPassword("");
      setStep("passkey");
    }
  }

  async function onPasskey() {
    setLoading(true);
    setError(null);
    const opts = await adminPasskeyAuthOptionsAction();
    if ("error" in opts && opts.error) {
      setLoading(false);
      setError(opts.error);
      return;
    }
    if (!("options" in opts) || !opts.options) {
      setLoading(false);
      setError("Passkey 옵션을 받지 못했습니다.");
      return;
    }
    try {
      const assertion = await startAuthentication(opts.options);
      const verified = await adminPasskeyAuthVerifyAction(assertion);
      setLoading(false);
      if ("error" in verified && verified.error) {
        setError(verified.error);
        return;
      }
      setStep("totp");
      setCode("");
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Passkey 인증이 취소되었습니다.");
    }
  }

  async function onTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const verified = await adminTotpAuthVerifyAction(code, {
      trustDevice,
      useRecovery,
    });
    setLoading(false);
    if ("error" in verified && verified.error) {
      setError(verified.error);
      return;
    }
    router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/admin");
    router.refresh();
  }

  async function onRestart() {
    setLoading(true);
    try {
      await adminLogoutMfaAction();
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }
    setLoading(false);
    setStep("password");
    setCode("");
    setPassword("");
    setError(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
        <p className="text-sm text-muted-foreground">관리자 로그인 준비 중…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <BrandLogo className="h-10 w-auto" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="text-sm text-muted-foreground">
            메인 사이트 로그인과 별개입니다. 관리자 계정으로 3단계 인증이 필요합니다.
          </p>
          <Stepper step={step} />
          {siteUsername && step === "password" ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              메인 사이트 세션(@{siteUsername})은 무시됩니다. 아래에서 관리자 계정으로 다시
              로그인해 주세요.
            </p>
          ) : null}
        </div>

        {step === "password" ? (
          <form onSubmit={onPasswordSubmit} className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">1단계 · 관리자 계정</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                이메일 또는 아이디
              </label>
              <Input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="mocomocompany 또는 owner@…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                비밀번호
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중…" : "다음 · Passkey 인증"}
            </Button>
          </form>
        ) : null}

        {step === "passkey" ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">2단계 · Passkey</p>
            <p className="text-sm text-muted-foreground">
              Windows Hello, Face ID, Touch ID 또는 보안 키로 인증하세요.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="button" className="w-full" disabled={loading} onClick={onPasskey}>
              {loading ? "대기 중…" : "Passkey로 인증"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={onRestart}>
              처음부터 · 계정 다시 입력
            </Button>
          </div>
        ) : null}

        {step === "totp" ? (
          <form onSubmit={onTotpSubmit} className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">3단계 · Authenticator</p>
            <p className="text-sm text-muted-foreground">
              Google / Microsoft Authenticator 앱의 6자리 코드를 입력하세요.
            </p>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={useRecovery ? 14 : 6}
              value={code}
              onChange={(e) =>
                setCode(
                  useRecovery
                    ? e.target.value.toUpperCase()
                    : e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              required
              placeholder={useRecovery ? "XXXX-XXXX-XXXX" : "000000"}
              className="tracking-[0.2em] font-mono text-center text-lg"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useRecovery}
                onChange={(e) => {
                  setUseRecovery(e.target.checked);
                  setCode("");
                }}
              />
              Recovery Code 사용
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
              />
              이 기기를 30일 동안 신뢰 (OWNER/SUPER_ADMIN 제외 · 다음 로그인부터)
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중…" : "인증 완료 · 관리자 페이지"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={onRestart}>
              처음부터 · 계정 다시 입력
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
