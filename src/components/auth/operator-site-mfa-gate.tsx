"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
import { performAdminWebSignOut } from "@/lib/admin/admin-web-sign-out";
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armedRef = useRef(false);
  const logoutLock = useRef(false);

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
        setError(errorText(res.error));
        setOpen(true);
        return;
      }
      if ("next" in res && res.next === "enroll") {
        setError(t("auth.passkey_otp_2"));
        setOpen(true);
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
        setError(errorText(opts.error));
        return;
      }
      if (!("options" in opts) || !opts.options) {
        setError(t("auth.passkey"));
        return;
      }
      const assertion = await startAuthentication(opts.options);
      const verified = await adminPasskeyAuthVerifyAction(assertion);
      if ("error" in verified && verified.error) {
        setError(errorText(verified.error));
        return;
      }
      setStep("totp");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("lib.admin.passkey_10"));
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
      setError(errorText(res.error));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onLogout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLoggingOut(true);
    setError(null);
    try {
      await performAdminWebSignOut("manual");
    } catch {
      logoutLock.current = false;
      setLoggingOut(false);
      setError(t("auth.shkd2p4"));
    }
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
        <div className="flex items-start justify-between gap-3">
          <h2 id="operator-mfa-title" className="text-lg font-black tracking-tight">
            {t("auth.sn2mjh9")}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={loggingOut}
            onClick={() => void onLogout()}
          >
            {loggingOut ? t("auth.s14a9snu") : t("menu.signOut")}
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {t("auth.passkey_otp_totp")}
        </p>

        {error ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === "passkey" ? (
          <div className="mt-5 space-y-3">
            <Button type="button" className="w-full" disabled={loading || loggingOut} onClick={() => void runPasskey()}>
              {loading ? t("auth.so18p3k") : t("auth.passkey_3")}
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <a href="/admin/enroll">{t("auth.passkey_otp")}</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void runTotp(e)} className="mt-5 space-y-3">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={useRecovery ? "Recovery code" : t("auth.6_otp")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading || loggingOut}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useRecovery}
                onChange={(e) => setUseRecovery(e.target.checked)}
              />
              {t("auth.recovery_code")}
            </label>
            <Button type="submit" className="w-full" disabled={loading || loggingOut || !code.trim()}>
              {loading ? t("community-server.sauj92q") : t("auth.otp")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
