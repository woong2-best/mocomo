"use client";

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
  resumeSellerConnectFromOnboarding,
  saveSellerAgreements,
  saveSellerInfo,
  startSellerStripeConnectOnboarding,
  verifySellerEmailCode,
} from "@/actions/marketplace-seller-onboarding";
import {
  STRIPE_SELLER_MARKETS,
  toSellerOnboardingUiStep,
  type SellerOnboardingStepId,
} from "@/lib/marketplace/seller-onboarding";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { MARKET_STRIPE_DISCLAIMER_KO } from "@/lib/marketplace/market-access";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type OnboardingState = Awaited<ReturnType<typeof getSellerOnboardingState>>;

const STRIPE_ONBOARDING_COPY =
  "Stripe로 안전하게 본인 확인 및 정산 계좌를 등록해 주세요. 신분증·사업자 정보·계좌는 Stripe에서 직접 수집합니다.";

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
      setMessage("입점비 결제가 완료되었습니다. 판매자 센터로 이동합니다.");
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
        if ("error" in res && res.error) setError(res.error);
        else refreshState();
      });
    } else if (connectParam === "refresh") {
      startTransition(async () => {
        const res = await resumeSellerConnectFromOnboarding({ fromApp, returnTo });
        if ("url" in res && res.url) openStripeConnectOnboardingUrl(res.url, fromApp);
        if ("error" in res && res.error) setError(res.error);
      });
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
      });
      if (res.error) {
        if ("alreadySignedIn" in res && res.alreadySignedIn) {
          setStep("AGREEMENTS");
          refreshState();
          return;
        }
        setError(res.error);
        return;
      }
      try {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
      } catch {
        /* ignore */
      }
      setEmail(res.email ?? email);
      setMessage("계정이 생성되었습니다. 이메일 인증 코드를 확인해 주세요.");
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
        setError(res.error);
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
        setError(res.error);
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
          setMessage("이메일 인증 완료. 로그인해 주세요.");
          router.push(`/auth/signin?callbackUrl=/market/seller/register`);
          return;
        }
      }
      setMessage("이메일 인증이 완료되었습니다.");
      refreshState();
    });
  }

  async function handleResendEmail() {
    setError("");
    startTransition(async () => {
      const res = await resendSellerEmailCode(email);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMessage("인증 코드를 다시 보냈습니다.");
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
        setError(res.error);
        return;
      }
      if ("nextStep" in res && res.nextStep) {
        setStep(res.nextStep as SellerOnboardingStepId);
      }
      refreshState();
    });
  }

  async function handleStripeConnect() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await startSellerStripeConnectOnboarding({ fromApp, returnTo });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        openStripeConnectOnboardingUrl(res.url, fromApp);
      }
    });
  }

  async function handleResumeStripe() {
    setError("");
    startTransition(async () => {
      const res = await resumeSellerConnectFromOnboarding({ fromApp, returnTo });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        openStripeConnectOnboardingUrl(res.url, fromApp);
      }
    });
  }

  let effectiveStep: SellerOnboardingStepId =
    state.signedIn && step === "ACCOUNT" ? "AGREEMENTS" : step;
  if (effectiveStep === "PHONE" || effectiveStep === "KYC") {
    effectiveStep = "SETTLEMENT";
  }

  const uiStep = toSellerOnboardingUiStep(effectiveStep);

  const title = useMemo(() => {
    if (effectiveStep === "ACCOUNT") return `${MARKET_BRAND_FULL}과 함께 비즈니스를 시작하세요!`;
    if (effectiveStep === "AGREEMENTS") return "약관 동의";
    if (effectiveStep === "EMAIL") return "이메일 인증";
    if (effectiveStep === "SELLER_INFO") return "판매자 · 사업자 정보";
    if (effectiveStep === "SETTLEMENT") return "Stripe 본인 확인 · 정산";
    return "가입 완료";
  }, [effectiveStep]);

  const stripeMessage =
    state.signedIn && "stripeStatusMessage" in state
      ? state.stripeStatusMessage
      : STRIPE_ONBOARDING_COPY;

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-center text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        {MARKET_BRAND_FULL} 판매자 온보딩
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
              <span className="font-medium text-foreground">{email}</span> 으로 보낸 6자리 코드를
              입력해 주세요.
            </p>
            <Input
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="인증 코드 6자리"
              inputMode="numeric"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending || emailCode.length !== 6}
                onClick={handleEmailVerify}
              >
                이메일 인증 완료
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={handleResendEmail}>
                코드 재전송
              </Button>
            </div>
          </div>
        )}

        {effectiveStep === "SELLER_INFO" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["INDIVIDUAL", "개인 판매자"],
                  ["BUSINESS", "사업자"],
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
              placeholder="판매자 표시 이름"
            />
            <Input
              value={businessRegNo}
              onChange={(e) => setBusinessRegNo(e.target.value)}
              placeholder={sellerType === "BUSINESS" ? "사업자등록번호 (필수)" : "주민/사업자 식별번호 (필수)"}
            />
            {sellerType === "BUSINESS" && (
              <>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="상호 / 법인명"
                />
                <Input
                  value={businessRepresentativeName}
                  onChange={(e) => setBusinessRepresentativeName(e.target.value)}
                  placeholder="대표자명"
                />
              </>
            )}
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="소개 (선택)"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {sellerType === "BUSINESS" && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                사업자등록증·대표자 정보는 Stripe 단계에서 추가로 확인합니다.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={pending || !displayName.trim() || !businessRegNo.trim()}
              onClick={handleSellerInfo}
            >
              다음
            </Button>
          </div>
        )}

        {effectiveStep === "SETTLEMENT" && (
          <div className="space-y-4">
            {!marketEligible ? (
              <p className="text-sm text-destructive leading-relaxed">
                선택한 판매 국가에서는 마켓플레이스 판매자 등록을 지원하지 않습니다. Stripe 지원
                국가를 선택해 주세요.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stripeMessage} {MARKET_STRIPE_DISCLAIMER_KO}
                </p>
                {state.signedIn && "stripeRequirementsDue" in state && state.stripeRequirementsDue && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Stripe에서 추가 정보 제출이 필요합니다. 온보딩을 이어서 완료해 주세요.
                  </div>
                )}
                {state.signedIn && "stripeDisabled" in state && state.stripeDisabled && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    Stripe 계정 확인이 필요합니다. 온보딩을 다시 진행해 주세요.
                  </div>
                )}
                <Button type="button" className="w-full" disabled={pending} onClick={handleStripeConnect}>
                  Stripe 온보딩 시작
                </Button>
                {state.signedIn && "stripeStarted" in state && state.stripeStarted && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={pending}
                    onClick={handleResumeStripe}
                  >
                    Stripe 온보딩 이어서 하기
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {effectiveStep === "COMPLETE" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">판매자 등록이 완료되었습니다.</p>
            {fromApp && returnTo ? (
              <Button type="button" className="w-full" onClick={() => window.location.replace(returnTo)}>
                앱으로 돌아가기
              </Button>
            ) : (
              <Button type="button" className="w-full" asChild>
                <Link href="/market/seller?welcome=1">판매자 센터로</Link>
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
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">판매 국가</label>
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
        placeholder="아이디"
        autoComplete="username"
      />
      <Input
        type="password"
        value={props.password}
        onChange={(e) => props.setPassword(e.target.value)}
        placeholder="비밀번호"
        autoComplete="new-password"
      />
      <Input
        type="password"
        value={props.passwordConfirm}
        onChange={(e) => props.setPasswordConfirm(e.target.value)}
        placeholder="비밀번호 확인"
        autoComplete="new-password"
      />
      <Input
        value={props.name}
        onChange={(e) => props.setName(e.target.value)}
        placeholder="이름"
        autoComplete="name"
      />
      <Input
        type="email"
        value={props.email}
        onChange={(e) => props.setEmail(e.target.value)}
        placeholder="이메일"
        autoComplete="email"
      />
      <Button type="button" className="w-full h-11 mt-2" disabled={props.pending} onClick={props.onSubmit}>
        가입하고 이메일 인증
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
          계정 생성 후 로그인하면 약관 동의가 저장됩니다. 이미 계정이 있다면{" "}
          <Link href="/auth/signin?callbackUrl=/market/seller/register" className="underline font-medium">
            로그인
          </Link>
          해 주세요.
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
          <span className="font-semibold text-sm">모두 동의합니다</span>
        </span>
      </label>
      <ul className="divide-y divide-border/70 border border-border/70 rounded-lg">
        <ConsentRow required checked={props.agreeAge} onToggle={() => toggle(props.setAgreeAge, props.agreeAge)} label="만 19세 이상입니다" />
        <ConsentRow required checked={props.agreeTerms} onToggle={() => toggle(props.setAgreeTerms, props.agreeTerms)} label={`${MARKET_BRAND_FULL} 판매자 서비스 이용약관`} onDetail={() => props.onOpenConsent("terms")} />
        <ConsentRow optional checked={props.agreeMarketing} onToggle={() => toggle(props.setAgreeMarketing, props.agreeMarketing)} label="마케팅 목적의 개인정보 수집 및 이용 동의" onDetail={() => props.onOpenConsent("marketing")} />
        <ConsentRow optional checked={props.agreePromo} onToggle={() => toggle(props.setAgreePromo, props.agreePromo)} label="특별 프로모션 혜택(광고) 수신 동의" />
        <li>
          <button type="button" onClick={() => props.onOpenConsent("privacy")} className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-muted/30">
            <span>개인정보 수집 및 이용 안내</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
      </ul>
      <Button type="button" className="w-full h-11" disabled={!props.canSubmit || props.pending || !props.signedIn} onClick={props.onSubmit}>
        약관 동의하고 계속하기
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
          {required ? "[필수]" : "[선택]"}
        </span>
        <span className="truncate">{label}</span>
        {onDetail && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />}
      </button>
    </li>
  );
}
