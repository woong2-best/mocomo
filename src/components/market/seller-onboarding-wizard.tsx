"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SellerOnboardingStepper } from "@/components/market/seller-onboarding-stepper";
import { SellerConsentDialog } from "@/components/market/seller-consent-dialog";
import {
  getSellerOnboardingState,
  markSellerConnectReturn,
  registerSellerAccount,
  resendSellerEmailCode,
  saveSellerAgreements,
  saveSellerInfo,
  verifySellerEmailCode,
} from "@/actions/marketplace-seller-onboarding";
import {
  STRIPE_SELLER_MARKETS,
  toSellerOnboardingUiStep,
  type SellerOnboardingStepId,
} from "@/lib/marketplace/seller-onboarding";
import { SettlementRegistrationPanel } from "@/components/wallet/settlement-registration-panel";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { MARKET_STRIPE_DISCLAIMER_KO } from "@/lib/marketplace/market-access";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type OnboardingState = Awaited<ReturnType<typeof getSellerOnboardingState>>;

const SETTLEMENT_REGISTER_COPY =
  t("market.stripe_express_w_9_w");

export function SellerOnboardingWizard({
  initialState,
  connectParam,
  fromApp = false,
  returnTo = null,
  freshStart = false,
}: {
  initialState: OnboardingState;
  connectParam?: string;
  fromApp?: boolean;
  returnTo?: string | null;
  /** Stripe 복귀가 아닌 일반 진입 — 약관부터 새로 시작 */
  freshStart?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const resolveEntryStep = (next: OnboardingState): SellerOnboardingStepId => {
    if (freshStart) {
      return next.signedIn ? "AGREEMENTS" : "ACCOUNT";
    }
    return next.signedIn ? next.step : "ACCOUNT";
  };
  const [step, setStep] = useState<SellerOnboardingStepId>(() => resolveEntryStep(initialState));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consentKind, setConsentKind] = useState<"terms" | "marketing" | "privacy" | null>(null);

  const [sellingMarket, setSellingMarket] = useState(() => {
    if (initialState.signedIn) {
      return (
        ("sellingMarket" in initialState && initialState.sellingMarket) ||
        initialState.countryCode ||
        "US"
      );
    }
    return "US";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState(initialState.signedIn ? initialState.name ?? "" : "");
  const [email, setEmail] = useState(initialState.signedIn ? initialState.email ?? "" : "");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreePromo, setAgreePromo] = useState(false);
  const [emailCode, setEmailCode] = useState("");

  const [sellerType, setSellerType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [displayName, setDisplayName] = useState(
    initialState.profile?.displayName ?? (initialState.signedIn ? initialState.name ?? "" : "")
  );
  const [bio, setBio] = useState(initialState.profile?.bio ?? "");
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessRepresentativeName, setBusinessRepresentativeName] = useState("");

  const onboardingUserId =
    initialState.signedIn && "userId" in initialState ? initialState.userId : null;

  useEffect(() => {
    const nextStep = resolveEntryStep(initialState);
    setState(initialState);
    setStep(nextStep);
    setError("");
    setMessage("");
    if (initialState.signedIn) {
      setName(initialState.name ?? "");
      setEmail(initialState.email ?? "");
      setDisplayName(initialState.profile?.displayName ?? initialState.name ?? "");
      setBio(initialState.profile?.bio ?? "");
      if (initialState.profile?.sellerType) {
        setSellerType(initialState.profile.sellerType);
      } else {
        setSellerType("INDIVIDUAL");
      }
      setSellingMarket(
        ("sellingMarket" in initialState && initialState.sellingMarket) ||
          initialState.countryCode ||
          "KR"
      );
    }
  }, [onboardingUserId, freshStart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("onboarding") === "fee_paid") {
      setMessage(t("market.s15t22n6"));
      refreshState();
    }
  }, []);

  useEffect(() => {
    if (connectParam === "return") {
      startTransition(async () => {
        const res = await markSellerConnectReturn();
        if ("redirectTo" in res && res.redirectTo) {
          router.replace(res.redirectTo);
          return;
        }
        if ("error" in res && res.error) setError(errorText(res.error));
        else refreshState();
      });
    } else if (connectParam === "refresh") {
      setMessage(t("market.reward"));
      refreshState();
    }
  }, [connectParam, fromApp, returnTo, router]);

  useEffect(() => {
    if (initialState.signedIn && initialState.step === "COMPLETE") {
      if (fromApp && returnTo) {
        window.location.replace(returnTo);
        return;
      }
      router.replace("/market/seller?welcome=1");
    }
  }, [fromApp, initialState, returnTo, router]);

  const mandatoryOk = agreeAge && agreeTerms;
  const canSubmitAgreements = mandatoryOk;

  function syncAgreeAll(next: boolean) {
    setAgreeAll(next);
    setAgreeAge(next);
    setAgreeTerms(next);
    setAgreeMarketing(next);
    setAgreePromo(next);
  }

  function refreshState() {
    startTransition(async () => {
      const next = await getSellerOnboardingState();
      setState(next);
      setStep(next.step);
    });
  }

  async function handleRegister() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await registerSellerAccount({
        username,
        password,
        passwordConfirm,
        name,
        email,
        sellingMarket,
        locale: "ko",
        timeZone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
        turnstileUnavailable: true,
        birthYear: Number(birthYear),
        birthMonth: Number(birthMonth),
        birthDay: Number(birthDay),
      });
      if (res.error) {
        if ("alreadySignedIn" in res && res.alreadySignedIn) {
          setStep("AGREEMENTS");
          refreshState();
          return;
        }
        setError(errorText(res.error));
        return;
      }
      try {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
      } catch {
        /* ignore */
      }
      setEmail(res.email ?? email);
      setMessage(t("market.s106m7ra"));
      setStep("EMAIL");
    });
  }

  async function handleAgreements() {
    setError("");
    startTransition(async () => {
      const res = await saveSellerAgreements({
        agreeAge: true,
        agreeTerms: true,
        agreePrivacy: true,
        agreeMarketing,
        agreePromo,
      });
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      setStep(res.nextStep as SellerOnboardingStepId);
      refreshState();
    });
  }

  async function handleEmailVerify() {
    setError("");
    startTransition(async () => {
      const res = await verifySellerEmailCode(email, emailCode);
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      const pw = (() => {
        try {
          return sessionStorage.getItem(SIGNUP_PASSWORD_SESSION_KEY);
        } catch {
          return null;
        }
      })();
      if (pw) {
        const signInResult = await signIn("credentials", {
          email: username || email,
          password: pw,
          redirect: false,
        });
        try {
          sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY);
        } catch {
          /* ignore */
        }
        if (signInResult?.error) {
          setMessage(t("market.s1u8g7cd"));
          router.push(`/auth/signin?callbackUrl=/market/seller/register`);
          return;
        }
      }
      setMessage(t("market.s1wfmdxm"));
      refreshState();
    });
  }

  async function handleResendEmail() {
    setError("");
    startTransition(async () => {
      const res = await resendSellerEmailCode(email);
      if (res && "error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setMessage(t("market.s5b732q"));
    });
  }

  const marketEligible =
    !state.signedIn || !("marketEligible" in state) || state.marketEligible !== false;

  async function handleSellerInfo() {
    setError("");
    startTransition(async () => {
      const res = await saveSellerInfo({
        sellerType,
        displayName,
        bio: bio || undefined,
        businessRegNo,
        businessName: businessName || undefined,
        businessRepresentativeName: businessRepresentativeName || undefined,
      });
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      if ("nextStep" in res && res.nextStep) {
        setStep(res.nextStep as SellerOnboardingStepId);
      }
      refreshState();
    });
  }

  let effectiveStep: SellerOnboardingStepId =
    state.signedIn && step === "ACCOUNT" ? "AGREEMENTS" : step;
  if (effectiveStep === "PHONE" || effectiveStep === "KYC") {
    effectiveStep = "SETTLEMENT";
  }

  const uiStep = toSellerOnboardingUiStep(effectiveStep);

  const title = useMemo(() => {
    if (effectiveStep === "ACCOUNT") return t("market.s1jmf6cy", { v0: MARKET_BRAND_FULL });
    if (effectiveStep === "AGREEMENTS") return t("market.scoh4fw");
    if (effectiveStep === "EMAIL") return t("auth.signupStep3");
    if (effectiveStep === "SELLER_INFO") return t("market.s1e38y6t");
    if (effectiveStep === "SETTLEMENT") return t("market.reward_2");
    return t("market.s1mfhojn");
  }, [effectiveStep]);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-center text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        {t("market.sellerOnboardingSubtitle", { brand: MARKET_BRAND_FULL })}
      </p>

      <SellerOnboardingStepper uiStep={uiStep} signedIn={state.signedIn} />

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}

        {effectiveStep === "ACCOUNT" && !state.signedIn && (
          <AccountStep
            sellingMarket={sellingMarket}
            setSellingMarket={setSellingMarket}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            passwordConfirm={passwordConfirm}
            setPasswordConfirm={setPasswordConfirm}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            birthYear={birthYear}
            setBirthYear={setBirthYear}
            birthMonth={birthMonth}
            setBirthMonth={setBirthMonth}
            birthDay={birthDay}
            setBirthDay={setBirthDay}
            pending={pending}
            onSubmit={handleRegister}
          />
        )}

        {effectiveStep === "AGREEMENTS" && (
          <AgreementsStep
            agreeAll={agreeAll}
            syncAgreeAll={syncAgreeAll}
            agreeAge={agreeAge}
            setAgreeAge={setAgreeAge}
            agreeTerms={agreeTerms}
            setAgreeTerms={setAgreeTerms}
            agreeMarketing={agreeMarketing}
            setAgreeMarketing={setAgreeMarketing}
            agreePromo={agreePromo}
            setAgreePromo={setAgreePromo}
            setAgreeAll={setAgreeAll}
            canSubmit={canSubmitAgreements}
            pending={pending}
            signedIn={state.signedIn}
            onOpenConsent={setConsentKind}
            onSubmit={handleAgreements}
          />
        )}

        {effectiveStep === "EMAIL" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> {t("market.s5hq67d")}
            </p>
            <Input
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("market.s13w0owl")}
              inputMode="numeric"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending || emailCode.length !== 6}
                onClick={handleEmailVerify}
              >
                {t("auth.emailVerifyDone")}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={handleResendEmail}>
                {t("market.s1hvzctt")}
              </Button>
            </div>
          </div>
        )}

        {effectiveStep === "SELLER_INFO" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["INDIVIDUAL", t("seller.individual")],
                  ["BUSINESS", t("seller.business")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSellerType(value)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                    sellerType === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("seller.displayName")}
            />
            <Input
              value={businessRegNo}
              onChange={(e) => setBusinessRegNo(e.target.value)}
              placeholder={sellerType === "BUSINESS" ? t("seller.businessRegNo") : t("market.s1smzti6")}
            />
            {sellerType === "BUSINESS" && (
              <>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t("seller.businessName")}
                />
                <Input
                  value={businessRepresentativeName}
                  onChange={(e) => setBusinessRepresentativeName(e.target.value)}
                  placeholder={t("seller.representative")}
                />
              </>
            )}
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("seller.bio")}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {sellerType === "BUSINESS" && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                {t("market.stripe_10")}
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={pending || !displayName.trim() || !businessRegNo.trim()}
              onClick={handleSellerInfo}
            >
              {t("seller.next")}
            </Button>
          </div>
        )}

        {effectiveStep === "SETTLEMENT" && (
          <div className="space-y-4">
            {!marketEligible ? (
              <p className="text-sm text-destructive leading-relaxed">
                {t("market.smooh5j")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {SETTLEMENT_REGISTER_COPY} {MARKET_STRIPE_DISCLAIMER_KO}
                </p>
                <SettlementRegistrationPanel
                  registered={
                    !!state.connectReady ||
                    (state.signedIn && "stripeStarted" in state && !!state.stripeStarted)
                  }
                  payoutsEnabled={!!state.connectReady}
                  hasConnectAccount={state.signedIn && "stripeStarted" in state && !!state.stripeStarted}
                  profile={null}
                  requestCardPayments
                />
              </>
            )}
          </div>
        )}

        {effectiveStep === "COMPLETE" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{t("seller.complete")}</p>
            {fromApp && returnTo ? (
              <Button type="button" className="w-full" onClick={() => window.location.replace(returnTo)}>
                {t("market.sutrk7r")}
              </Button>
            ) : (
              <Button type="button" className="w-full" asChild>
                <Link href="/market/seller?welcome=1">{t("seller.sellerCenter")}</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <SellerConsentDialog
        open={consentKind !== null}
        kind={consentKind}
        onOpenChange={(open) => {
          if (!open) setConsentKind(null);
        }}
      />
    </div>
  );
}

function AccountStep(props: {
  sellingMarket: string;
  setSellingMarket: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  birthYear: string;
  setBirthYear: (v: string) => void;
  birthMonth: string;
  setBirthMonth: (v: string) => void;
  birthDay: string;
  setBirthDay: (v: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{t("seller.sellingCountry")}</label>
      <select
        value={props.sellingMarket}
        onChange={(e) => props.setSellingMarket(e.target.value)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {STRIPE_SELLER_MARKETS.map((m) => (
          <option key={m.code} value={m.code}>
            {m.labelKo}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2 leading-relaxed">
        {MARKET_STRIPE_DISCLAIMER_KO}
      </p>
      <Input
        value={props.username}
        onChange={(e) => props.setUsername(e.target.value)}
        placeholder={t("auth.emailLocalPart")}
        autoComplete="username"
      />
      <Input
        type="password"
        value={props.password}
        onChange={(e) => props.setPassword(e.target.value)}
        placeholder={t("auth.passwordSimple")}
        autoComplete="new-password"
      />
      <Input
        type="password"
        value={props.passwordConfirm}
        onChange={(e) => props.setPasswordConfirm(e.target.value)}
        placeholder={t("market.sz31113")}
        autoComplete="new-password"
      />
      <Input
        value={props.name}
        onChange={(e) => props.setName(e.target.value)}
        placeholder={t("market.name")}
        autoComplete="name"
      />
      <Input
        type="email"
        value={props.email}
        onChange={(e) => props.setEmail(e.target.value)}
        placeholder={t("settings.email")}
        autoComplete="email"
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          value={props.birthYear}
          onChange={(e) => props.setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="YYYY"
          inputMode="numeric"
          autoComplete="bday-year"
        />
        <Input
          value={props.birthMonth}
          onChange={(e) => props.setBirthMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="MM"
          inputMode="numeric"
          autoComplete="bday-month"
        />
        <Input
          value={props.birthDay}
          onChange={(e) => props.setBirthDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="DD"
          inputMode="numeric"
          autoComplete="bday-day"
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {t("market.sfiqw9u")}
      </p>
      <Button type="button" className="w-full h-11 mt-2" disabled={props.pending} onClick={props.onSubmit}>
        {t("market.sn9hhlo")}
      </Button>
    </div>
  );
}

function AgreementsStep(props: {
  agreeAll: boolean;
  syncAgreeAll: (v: boolean) => void;
  agreeAge: boolean;
  setAgreeAge: (v: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  agreeMarketing: boolean;
  setAgreeMarketing: (v: boolean) => void;
  agreePromo: boolean;
  setAgreePromo: (v: boolean) => void;
  setAgreeAll: (v: boolean) => void;
  canSubmit: boolean;
  pending: boolean;
  signedIn: boolean;
  onOpenConsent: (k: "terms" | "marketing" | "privacy") => void;
  onSubmit: () => void;
}) {
  function toggle(setter: (v: boolean) => void, value: boolean) {
    setter(!value);
    props.setAgreeAll(false);
  }

  return (
    <div className="space-y-4">
      {!props.signedIn && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-lg px-3 py-2">
          {t("market.signInAfterAccountCreate")}{" "}
          <Link href="/auth/signin?callbackUrl=/market/seller/register" className="underline font-medium">
            {t("auth.signIn")}
          </Link>
          {t("market.s17wjgua")}
        </p>
      )}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={props.agreeAll}
          onChange={(e) => props.syncAgreeAll(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-semibold text-sm">{t("market.s1be383y")}</span>
        </span>
      </label>
      <ul className="divide-y divide-border/70 border border-border/70 rounded-lg">
        <ConsentRow required checked={props.agreeAge} onToggle={() => toggle(props.setAgreeAge, props.agreeAge)} label={t("market.s1ajsb9s")} />
        <ConsentRow required checked={props.agreeTerms} onToggle={() => toggle(props.setAgreeTerms, props.agreeTerms)} label={t("market.sqnz0kg", { v0: MARKET_BRAND_FULL })} onDetail={() => props.onOpenConsent("terms")} />
        <ConsentRow optional checked={props.agreeMarketing} onToggle={() => toggle(props.setAgreeMarketing, props.agreeMarketing)} label={t("market.srcv2tg")} onDetail={() => props.onOpenConsent("marketing")} />
        <ConsentRow optional checked={props.agreePromo} onToggle={() => toggle(props.setAgreePromo, props.agreePromo)} label={t("market.s1etrdwt")} />
        <li>
          <button type="button" onClick={() => props.onOpenConsent("privacy")} className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-muted/30">
            <span>{t("market.s1s0ifhg")}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
      </ul>
      <Button type="button" className="w-full h-11" disabled={!props.canSubmit || props.pending || !props.signedIn} onClick={props.onSubmit}>
        {t("market.s1rcxhz1")}
      </Button>
    </div>
  );
}

function ConsentRow({
  required,
  optional,
  checked,
  onToggle,
  label,
  onDetail,
}: {
  required?: boolean;
  optional?: boolean;
  checked: boolean;
  onToggle: () => void;
  label: string;
  onDetail?: () => void;
}) {
  return (
    <li className="flex items-center gap-2 px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <button type="button" className="flex-1 text-left text-sm flex items-center gap-1.5 min-w-0" onClick={onDetail ?? onToggle}>
        <span className={cn("shrink-0 text-[11px] font-semibold", required && "text-primary", optional && "text-muted-foreground")}>
          {required ? t("market.sxro0e") : t("market.suvz7p")}
        </span>
        <span className="truncate">{label}</span>
        {onDetail && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />}
      </button>
    </li>
  );
}
