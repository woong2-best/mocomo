"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { sendEmailAuthCode, verifyAuthCodeOnly, completeAuthWithCode } from "@/actions/auth";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { finishAddAccountFlow } from "@/lib/account-switch/add-account-flow";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";
import {
  clearSignupLocaleStorage,
  resolveEmailVerifyLocale,
  resolveSignupFlowCountry,
  syncSignupLocaleClient,
} from "@/lib/signup-locale-sync";
import { EmailAddressField } from "@/components/auth/email-address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { useLocale } from "@/components/providers/locale-provider";
import { getMailboxProviderFromEmail } from "@/lib/mailbox-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { isTurnstileConfigured } from "@/lib/turnstile-client";

const TurnstileField = dynamic(
  () => import("@/components/auth/turnstile-field").then((m) => m.TurnstileField),
  {
    ssr: false,
    loading: () => <TurnstileLoading />,
  }
);

function TurnstileLoading() {
  const { t } = useLocale();
  return <p className="text-xs text-muted-foreground text-center py-3">{t("auth.turnstileLoading")}</p>;
}

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* private mode / storage blocked */
  }
}

type Step = "code" | "reset-password" | "signup-done" | "reset-done";
type Mode = "signup" | "reset";

function deliveryHelpKey(email: string): MessageKey {
  const provider = getMailboxProviderFromEmail(email);
  if (provider === "microsoft") return "auth.emailDeliveryHelpMicrosoft";
  if (provider === "apple") return "auth.emailDeliveryHelpApple";
  return "auth.emailDeliveryHelp";
}

export function EmailVerifyFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLocale: syncProviderLocale } = useLocale();
  const initialEmail = searchParams.get("email") ?? "";
  const initialMode = (searchParams.get("mode") === "reset" ? "reset" : "signup") as Mode;
  const signupCodeAlreadySent = initialMode === "signup" && !!initialEmail.trim();
  const paramLocale = searchParams.get("locale");

  const [flowLocale] = useState<Locale>(() =>
    resolveEmailVerifyLocale(initialMode, paramLocale)
  );
  const t = useMemo(() => createTranslator(flowLocale), [flowLocale]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const [unregisteredDialogOpen, setUnregisteredDialogOpen] = useState(false);

  function isUnregisteredEmailError(result: { error?: string; code?: string }): boolean {
    return result.code === "EMAIL_NOT_REGISTERED";
  }

  useEffect(() => {
    const country = resolveSignupFlowCountry();
    syncSignupLocaleClient(flowLocale, country);
    void syncProviderLocale(flowLocale, country);

    const translate = createTranslator(flowLocale);
    if (initialEmail) {
      setMessage(translate("auth.checkEmailCode"));
    }

    safeSessionRemove("mocomo_signup_notice");

    if (signupCodeAlreadySent) {
      try {
        router.prefetch(DEFAULT_LANDING_PATH);
      } catch {
        /* ignore */
      }
    }
  }, [router, signupCodeAlreadySent, initialEmail, flowLocale, syncProviderLocale]);

  async function sendCode() {
    if (!email.trim()) return;
    const skipTurnstile =
      (mode === "signup" && signupCodeAlreadySent) || turnstileUnavailable;
    if (isTurnstileConfigured() && !turnstileToken && !skipTurnstile) {
      setError(t("auth.turnstileRequired"));
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const result = await sendEmailAuthCode(
      email.trim().toLowerCase(),
      mode,
      turnstileToken || undefined,
      skipTurnstile
    );
    setLoading(false);
    if ("error" in result && result.error) {
      if (mode === "reset" && isUnregisteredEmailError(result)) {
        setError("");
        setMessage("");
        setUnregisteredDialogOpen(true);
        return;
      }
      setError(result.error);
      return;
    }
    setMessage(result.message ?? t("auth.codeSent"));
  }

  async function verifySignupCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    setMessage("");
    const normalized = email.trim().toLowerCase();
    const result = await completeAuthWithCode(normalized, code, { mode: "signup" });
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const stored = safeSessionGet(SIGNUP_PASSWORD_SESSION_KEY);
    safeSessionRemove(SIGNUP_PASSWORD_SESSION_KEY);

    if (stored) {
      setMessage(t("auth.signingInProgress"));
      const signInResult = await signIn("credentials", {
        email: normalized,
        password: stored,
        redirect: false,
      });
      if (!signInResult?.error) {
        clearSignupLocaleStorage();
        await getSession();
        await finishAddAccountFlow();
        router.refresh();
        router.replace(DEFAULT_LANDING_PATH);
        return;
      }
      setSignupPassword(stored);
      setError(t("auth.verifyDoneLoginHint"));
      setStep("signup-done");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("signup-done");
  }

  async function verifyResetCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    const result = await verifyAuthCodeOnly(email.trim().toLowerCase(), code);
    setLoading(false);
    if (result.error) {
      if (isUnregisteredEmailError(result)) {
        setUnregisteredDialogOpen(true);
        setError("");
        return;
      }
      setError(result.error);
      return;
    }
    setStep("reset-password");
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    const result = await completeAuthWithCode(email.trim().toLowerCase(), code, {
      mode: "reset",
      newPassword,
    });
    setLoading(false);
    if (result.error) {
      if (isUnregisteredEmailError(result)) {
        setUnregisteredDialogOpen(true);
        setError("");
        return;
      }
      setError(result.error);
      return;
    }
    setStep("reset-done");
  }

  const unregisteredDialog = (
    <Dialog open={unregisteredDialogOpen} onOpenChange={setUnregisteredDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("auth.noticeDialogTitle")}</DialogTitle>
          <DialogDescription className="text-base text-foreground pt-2">
            {t("auth.unregisteredEmail")}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          className="w-full rounded-xl"
          onClick={() => setUnregisteredDialogOpen(false)}
        >
          {t("auth.confirmAction")}
        </Button>
      </DialogContent>
    </Dialog>
  );

  if (step === "signup-done") {
    return (
      <>
        {unregisteredDialog}
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle>{t("auth.emailVerifyDone")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-green-700 bg-green-500/10 rounded-xl px-3 py-2 text-center">
            {t("auth.verifyDoneLoginDesc")}
          </p>
          {signupPassword ? (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              <p className="text-xs text-muted-foreground">{t("auth.signupPasswordHint")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-base font-mono break-all">
                  {showPassword ? signupPassword : "••••••••"}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">{t("auth.forgetPasswordInfo")}</p>
          )}
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(DEFAULT_LANDING_PATH)}`}>
              {t("auth.loginAndHome")}
            </Link>
          </Button>
          {!signupPassword && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                setMode("reset");
                setStep("code");
                setCode("");
                setMessage(t("auth.setNewPasswordPrompt"));
                setError("");
              }}
            >
              {t("auth.setNewPasswordAction")}
            </Button>
          )}
        </CardContent>
      </Card>
      </>
    );
  }

  if (step === "reset-done") {
    return (
      <>
        {unregisteredDialog}
      <Card className="w-full max-w-md rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-green-700 font-medium">{t("auth.passwordResetDone")}</p>
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}>{t("auth.loginAction")}</Link>
          </Button>
        </CardContent>
      </Card>
      </>
    );
  }

  if (step === "reset-password") {
    return (
      <>
        {unregisteredDialog}
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>{t("auth.newPasswordTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.newPasswordDesc")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitNewPassword} className="space-y-3">
            <Input
              type="password"
              placeholder={t("auth.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder={t("auth.confirmPasswordPlaceholder")}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              minLength={8}
              required
              className="rounded-xl"
            />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? t("auth.saving") : t("auth.changePassword")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => setStep("code")}
            >
              {t("auth.reenterCode")}
            </Button>
          </form>
        </CardContent>
      </Card>
      </>
    );
  }

  return (
    <>
      {unregisteredDialog}
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center space-y-2">
        {mode === "signup" && signupCodeAlreadySent ? (
          <SignupStepIndicator step={3} locale={flowLocale} />
        ) : null}
        <CardTitle>
          {signupCodeAlreadySent ? t("auth.emailCodeTitle") : t("auth.emailVerifyForgot")}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {signupCodeAlreadySent ? t("auth.emailCodeDescSignup") : t("auth.emailCodeDescGeneric")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex rounded-xl border p-1 bg-muted/30">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("signup")}
          >
            {t("auth.signupVerifyTab")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "reset" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("reset")}
          >
            {t("auth.passwordResetTab")}
          </button>
        </div>

        <EmailAddressField
          id="email-verify"
          value={email}
          onChange={setEmail}
          required
          locale={flowLocale}
        />

        {!signupCodeAlreadySent ? (
          <>
            <TurnstileField
              className="flex justify-center min-h-[65px]"
              showSkipImmediately
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
              onUnavailable={setTurnstileUnavailable}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={sendCode}
              disabled={loading || !email.trim()}
            >
              {loading ? t("auth.sending") : t("auth.sendCode")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{t("auth.rateLimitHint")}</p>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={sendCode}
            disabled={loading || !email.trim()}
          >
            {loading ? t("auth.sending") : t("auth.resendCode")}
          </Button>
        )}

        {signupCodeAlreadySent && (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 leading-relaxed">
            {t(deliveryHelpKey(email))}
          </p>
        )}

        <form
          onSubmit={mode === "reset" ? verifyResetCode : verifySignupCode}
          className="space-y-3"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("auth.codePlaceholder")}
            inputMode="numeric"
            maxLength={6}
            className="rounded-xl text-center text-2xl tracking-[0.4em] font-semibold"
          />
          <Button type="submit" className="w-full rounded-xl" disabled={loading || code.length !== 6}>
            {loading
              ? mode === "signup"
                ? t("auth.verifyLoginProgress")
                : t("auth.verifyChecking")
              : mode === "reset"
                ? t("auth.verifyCodeToPassword")
                : t("auth.verifyGoHome")}
          </Button>
        </form>

        {message && <p className="text-green-700 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>}
        {error && <p className="text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

        <p className="text-center text-muted-foreground text-xs">{t("auth.checkSpam")}</p>
        <Link href="/auth/signin" className="block text-center text-sm text-primary">
          {t("auth.backToSigninLink")}
        </Link>
      </CardContent>
    </Card>
    </>
  );
}
