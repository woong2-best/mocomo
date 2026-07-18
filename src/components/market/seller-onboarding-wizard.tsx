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
  advanceSellerPhoneStep,
  completeSellerOnboarding,
  getSellerOnboardingState,
  markSellerConnectReturn,
  registerSellerAccount,
  resendSellerEmailCode,
  resumeSellerConnectFromOnboarding,
  saveSellerAgreements,
  saveSellerInfo,
  skipSellerSettlementForNow,
  startSellerSettlementOnboarding,
  submitSellerKycPrep,
  verifySellerEmailCode,
} from "@/actions/marketplace-seller-onboarding";
import {
  sendSellerPhoneOtp,
  sendSellerSignupPhoneOtp,
  verifySellerPhoneOtp,
  verifySellerSignupPhoneOtp,
} from "@/actions/phone-verification";
import {
  SELLER_PHONE_COUNTRIES,
  sellerPhoneDialLabel,
} from "@/lib/marketplace/seller-phone-countries";
import { SELLER_MARKETS, type SellerOnboardingStepId } from "@/lib/marketplace/seller-onboarding";
import { phonePlaceholderForCountry } from "@/lib/phone-international";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type OnboardingState = Awaited<ReturnType<typeof getSellerOnboardingState>>;

export function SellerOnboardingWizard({
  initialState,
  connectParam,
}: {
  initialState: OnboardingState;
  connectParam?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState<SellerOnboardingStepId>(initialState.step);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consentKind, setConsentKind] = useState<"terms" | "marketing" | "privacy" | null>(null);

  // Account form
  const [sellingMarket, setSellingMarket] = useState("KR");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState(initialState.signedIn ? initialState.name ?? "" : "");
  const [email, setEmail] = useState(initialState.signedIn ? initialState.email ?? "" : "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initialState.signedIn ? initialState.phoneCountryCode ?? "KR" : "KR"
  );

  // Agreements
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreePromo, setAgreePromo] = useState(false);

  // Email / phone
  const [emailCode, setEmailCode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneProof, setPhoneProof] = useState("");
  const [phoneVerifiedOnForm, setPhoneVerifiedOnForm] = useState(
    !!(initialState.signedIn && initialState.phoneVerified)
  );

  // Seller info
  const [sellerType, setSellerType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [displayName, setDisplayName] = useState(
    initialState.profile?.displayName ?? (initialState.signedIn ? initialState.name ?? "" : "")
  );
  const [bio, setBio] = useState(initialState.profile?.bio ?? "");
  const [businessName, setBusinessName] = useState(initialState.profile?.businessName ?? "");
  const [businessRegNo, setBusinessRegNo] = useState(initialState.profile?.businessRegNo ?? "");

  useEffect(() => {
    if (connectParam === "return") {
      startTransition(async () => {
        const res = await markSellerConnectReturn();
        if ("redirectTo" in res && res.redirectTo) {
          router.replace(res.redirectTo);
          return;
        }
        if ("error" in res && res.error) setError(res.error);
      });
    } else if (connectParam === "refresh") {
      startTransition(async () => {
        const res = await resumeSellerConnectFromOnboarding();
        if ("url" in res && res.url) window.location.href = res.url;
        if ("error" in res && res.error) setError(res.error);
      });
    }
  }, [connectParam, router]);

  useEffect(() => {
    if (initialState.signedIn && initialState.step === "COMPLETE") {
      router.replace("/market/seller?welcome=1");
    }
  }, [initialState, router]);

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
    if (!phoneVerifiedOnForm || !phoneProof) {
      setError("휴대폰 인증을 완료해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await registerSellerAccount({
        username,
        password,
        passwordConfirm,
        name,
        email,
        sellingMarket,
        phoneCountryCode,
        phone,
        phoneProof,
        locale: "ko",
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

  async function handleAccountSendPhone() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await sendSellerSignupPhoneOtp(phone, phoneCountryCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      if ("alreadyVerified" in res && res.alreadyVerified) {
        setPhoneVerifiedOnForm(true);
        setPhoneProof("session-verified");
        setMessage(res.message ?? "이미 인증된 번호입니다.");
        return;
      }
      setPhoneSent(true);
      setPhoneVerifiedOnForm(false);
      setPhoneProof("");
      setMessage(res.message ?? "인증번호를 보냈습니다.");
      if (res.devCode) setPhoneCode(res.devCode);
    });
  }

  async function handleAccountVerifyPhone() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await verifySellerSignupPhoneOtp(phone, phoneCode, phoneCountryCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.phoneProof) {
        setPhoneProof(res.phoneProof);
        setPhoneVerifiedOnForm(true);
        setMessage(`휴대폰 인증 완료${res.phoneDisplay ? ` (${res.phoneDisplay})` : ""}`);
      }
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
      const next = await getSellerOnboardingState();
      setState(next);
      setStep(next.step);
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

  async function handleSendPhone() {
    setError("");
    startTransition(async () => {
      const res = await sendSellerPhoneOtp(phone, phoneCountryCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      if ("alreadyVerified" in res && res.alreadyVerified) {
        await advanceSellerPhoneStep(phoneCountryCode);
        setStep("SELLER_INFO");
        refreshState();
        return;
      }
      setPhoneSent(true);
      setMessage(res.message ?? "인증번호를 보냈습니다.");
      if (res.devCode) setPhoneCode(res.devCode);
    });
  }

  async function handleVerifyPhone() {
    setError("");
    startTransition(async () => {
      const res = await verifySellerPhoneOtp(phone, phoneCode, phoneCountryCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      await advanceSellerPhoneStep(phoneCountryCode);
      setMessage("휴대폰 인증이 완료되었습니다.");
      setStep("SELLER_INFO");
      refreshState();
    });
  }

  async function handleSellerInfo() {
    setError("");
    startTransition(async () => {
      const res = await saveSellerInfo({
        sellerType,
        displayName,
        bio: bio || undefined,
        businessName: businessName || undefined,
        businessRegNo: businessRegNo || undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setStep("KYC");
    });
  }

  async function handleKyc(mode: "defer" | "start") {
    setError("");
    startTransition(async () => {
      try {
        const res = await submitSellerKycPrep(mode);
        if (res.success) setStep("SETTLEMENT");
      } catch {
        setError("본인 인증 단계를 저장하지 못했습니다. 다시 시도해 주세요.");
      }
    });
  }

  async function handleConnect() {
    setError("");
    startTransition(async () => {
      const res = await startSellerSettlementOnboarding();
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) window.location.href = res.url;
    });
  }

  async function handleSkipSettlement() {
    setError("");
    startTransition(async () => {
      const res = await skipSellerSettlementForNow();
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("redirectTo" in res && res.redirectTo) {
        router.replace(res.redirectTo);
      }
    });
  }

  async function handleComplete() {
    setError("");
    startTransition(async () => {
      const res = await completeSellerOnboarding();
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("redirectTo" in res && res.redirectTo) {
        router.replace(res.redirectTo);
      }
    });
  }

  const title = useMemo(() => {
    if (step === "ACCOUNT") return "MoCoMo MARKET과 함께 비즈니스를 시작하세요!";
    if (step === "AGREEMENTS") return "약관 동의";
    if (step === "EMAIL") return "이메일 인증";
    if (step === "PHONE") return "휴대폰 인증";
    if (step === "SELLER_INFO") return "판매자 정보";
    if (step === "KYC") return "본인 인증 준비";
    if (step === "SETTLEMENT") return "정산 계좌 등록";
    return "가입 완료";
  }, [step]);

  // Logged-in users skip ACCOUNT
  const effectiveStep =
    state.signedIn && step === "ACCOUNT" ? "AGREEMENTS" : step;

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-center text-xl sm:text-2xl font-bold text-[#1a1a1a] mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        MoCoMo MARKET 판매자 온보딩 · 동일 계정으로 구매·판매
      </p>

      <SellerOnboardingStepper step={effectiveStep} />

      <div className="rounded-xl border border-[#d8dee6] bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

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
            phoneCountryCode={phoneCountryCode}
            setPhoneCountryCode={(v) => {
              setPhoneCountryCode(v);
              setPhoneVerifiedOnForm(false);
              setPhoneProof("");
              setPhoneSent(false);
              setPhoneCode("");
            }}
            phone={phone}
            setPhone={(v) => {
              setPhone(v);
              setPhoneVerifiedOnForm(false);
              setPhoneProof("");
            }}
            phoneCode={phoneCode}
            setPhoneCode={setPhoneCode}
            phoneSent={phoneSent}
            phoneVerified={phoneVerifiedOnForm}
            pending={pending}
            onSendPhone={handleAccountSendPhone}
            onVerifyPhone={handleAccountVerifyPhone}
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
              <Button type="button" disabled={pending || emailCode.length !== 6} onClick={handleEmailVerify}>
                이메일 인증 완료
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={handleResendEmail}>
                코드 재전송
              </Button>
            </div>
          </div>
        )}

        {effectiveStep === "PHONE" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">휴대폰번호</label>
            <div className="flex gap-2">
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm shrink-0"
              >
                {SELLER_PHONE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {sellerPhoneDialLabel(c.code)}
                  </option>
                ))}
              </select>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={phonePlaceholderForCountry(phoneCountryCode)}
                className="flex-1"
              />
              <Button type="button" variant="secondary" disabled={pending || !phone} onClick={handleSendPhone}>
                인증 요청
              </Button>
            </div>
            {phoneSent && (
              <>
                <Input
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  inputMode="numeric"
                />
                <Button
                  type="button"
                  disabled={pending || phoneCode.length !== 6}
                  onClick={handleVerifyPhone}
                  className="w-full"
                >
                  인증 확인
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              지원 국가: 중국 · 홍콩 · 한국 · 일본 · 미국 / 계정당 번호 1개
            </p>
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
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="소개 (선택)"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {sellerType === "BUSINESS" && (
              <>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="사업자명"
                />
                <Input
                  value={businessRegNo}
                  onChange={(e) => setBusinessRegNo(e.target.value)}
                  placeholder="사업자등록번호"
                />
              </>
            )}
            <Button type="button" className="w-full" disabled={pending || !displayName.trim()} onClick={handleSellerInfo}>
              다음
            </Button>
          </div>
        )}

        {effectiveStep === "KYC" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              본인·사업자 확인(KYC)은 안전한 거래를 위해 필요합니다. 1차에서는 준비 단계만 저장하며,
              실명·사업자 서류 검증은 2차 Seller Center에서 연동됩니다.
            </p>
            <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>개인: 성인(만 19세 이상) 확인 · 향후 본인인증</li>
              <li>사업자: 사업자등록 정보 확인 · 향후 서류 검증</li>
            </ul>
            <div className="flex flex-col gap-2">
              <Button type="button" disabled={pending} onClick={() => handleKyc("start")}>
                KYC 신청 접수 (준비)
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => handleKyc("defer")}>
                나중에 하기
              </Button>
            </div>
          </div>
        )}

        {effectiveStep === "SETTLEMENT" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              판매 대금 정산을 위해 Stripe Connect 계좌를 연결합니다. 지금 연결하지 않아도 판매자
              센터 이용은 가능하지만, 정산은 Connect 완료 후 가능합니다.
            </p>
            <Button type="button" className="w-full" disabled={pending} onClick={handleConnect}>
              정산 계좌 연결 (Stripe Connect)
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={handleSkipSettlement}
            >
              나중에 연결하고 판매자센터로
            </Button>
            {state.connectReady && (
              <Button type="button" className="w-full" disabled={pending} onClick={handleComplete}>
                가입 완료
              </Button>
            )}
          </div>
        )}

        {effectiveStep === "COMPLETE" && (
          <div className="space-y-3 text-center">
            <p className="text-sm">판매자 온보딩이 완료되었습니다.</p>
            <Button
              type="button"
              className="w-full"
              onClick={() => router.replace("/market/seller?welcome=1")}
            >
              판매자센터로 이동
            </Button>
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        이미 계정이 있나요?{" "}
        <Link
          href="/auth/signin?callbackUrl=/market/seller/register"
          className="text-primary hover:underline font-medium"
        >
          로그인
        </Link>
      </p>

      <SellerConsentDialog
        open={!!consentKind}
        kind={consentKind}
        onOpenChange={(o) => !o && setConsentKind(null)}
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
  phoneCountryCode: string;
  setPhoneCountryCode: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  phoneCode: string;
  setPhoneCode: (v: string) => void;
  phoneSent: boolean;
  phoneVerified: boolean;
  pending: boolean;
  onSendPhone: () => void;
  onVerifyPhone: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1.5">판매시장 선택</label>
        <select
          value={props.sellingMarket}
          onChange={(e) => props.setSellingMarket(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {SELLER_MARKETS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.labelKo}
            </option>
          ))}
        </select>
      </div>
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

      <div>
        <label className="block text-sm font-medium mb-1.5">휴대폰번호</label>
        <div className="flex gap-2">
          <select
            value={props.phoneCountryCode}
            onChange={(e) => props.setPhoneCountryCode(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm shrink-0 max-w-[9.5rem]"
            disabled={props.phoneVerified}
          >
            {SELLER_PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {sellerPhoneDialLabel(c.code)}
              </option>
            ))}
          </select>
          <Input
            value={props.phone}
            onChange={(e) => props.setPhone(e.target.value)}
            placeholder={phonePlaceholderForCountry(props.phoneCountryCode)}
            className="flex-1"
            disabled={props.phoneVerified}
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            disabled={props.pending || !props.phone.trim() || props.phoneVerified}
            onClick={props.onSendPhone}
          >
            {props.phoneVerified ? "인증 완료" : "인증 요청"}
          </Button>
        </div>
        {props.phoneSent && !props.phoneVerified && (
          <div className="flex gap-2 mt-2">
            <Input
              value={props.phoneCode}
              onChange={(e) => props.setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="인증번호 6자리"
              inputMode="numeric"
              className="flex-1"
            />
            <Button
              type="button"
              disabled={props.pending || props.phoneCode.length !== 6}
              onClick={props.onVerifyPhone}
            >
              확인
            </Button>
          </div>
        )}
        {props.phoneVerified && (
          <p className="text-xs text-emerald-700 mt-1.5">휴대폰 인증이 완료되었습니다.</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          지원: 중국 · 홍콩 · 한국 · 일본 · 미국 / 번호당 계정 1개
        </p>
      </div>

      <Button
        type="button"
        className="w-full h-11 mt-2"
        disabled={props.pending || !props.phoneVerified}
        onClick={props.onSubmit}
      >
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
  function toggle(
    setter: (v: boolean) => void,
    value: boolean
  ) {
    setter(!value);
    props.setAgreeAll(false);
  }

  return (
    <div className="space-y-4">
      {!props.signedIn && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
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
          <span className="block text-xs text-muted-foreground mt-0.5">
            필수 항목 및 선택 항목(마케팅)이 포함되며, 선택 항목에 동의하지 않아도 서비스를 이용할 수
            있습니다.
          </span>
        </span>
      </label>

      {!props.canSubmit && (
        <p className="text-xs text-destructive flex items-center gap-1">
          필수 항목에 모두 동의해 주세요
        </p>
      )}

      <ul className="divide-y divide-border/70 border border-border/70 rounded-lg">
        <ConsentRow
          required
          checked={props.agreeAge}
          onToggle={() => toggle(props.setAgreeAge, props.agreeAge)}
          label="만 19세 이상입니다"
        />
        <ConsentRow
          required
          checked={props.agreeTerms}
          onToggle={() => toggle(props.setAgreeTerms, props.agreeTerms)}
          label="MoCoMo MARKET 판매자 서비스 이용약관 - 사업자용"
          onDetail={() => props.onOpenConsent("terms")}
        />
        <ConsentRow
          optional
          checked={props.agreeMarketing}
          onToggle={() => toggle(props.setAgreeMarketing, props.agreeMarketing)}
          label="마케팅 목적의 개인정보 수집 및 이용 동의"
          onDetail={() => props.onOpenConsent("marketing")}
        />
        <ConsentRow
          optional
          checked={props.agreePromo}
          onToggle={() => toggle(props.setAgreePromo, props.agreePromo)}
          label="특별 프로모션 혜택(광고) 수신 동의"
        />
        <li>
          <button
            type="button"
            onClick={() => props.onOpenConsent("privacy")}
            className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-muted/30"
          >
            <span>개인정보 수집 및 이용 안내</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
      </ul>

      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">확인해주세요</p>
        <p>· 마케팅 동의를 거부해도 판매자 서비스는 이용할 수 있습니다.</p>
        <p>· 동의 설정은 판매자센터에서 나중에 변경할 수 있습니다.</p>
      </div>

      <Button
        type="button"
        className="w-full h-11"
        disabled={!props.canSubmit || props.pending || !props.signedIn}
        onClick={props.onSubmit}
      >
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
      <button
        type="button"
        className="flex-1 text-left text-sm flex items-center gap-1.5 min-w-0"
        onClick={onDetail ?? onToggle}
      >
        <span
          className={cn(
            "shrink-0 text-[11px] font-semibold",
            required && "text-primary",
            optional && "text-muted-foreground"
          )}
        >
          {required ? "[필수]" : "[선택]"}
        </span>
        <span className="truncate">{label}</span>
      </button>
      {onDetail && (
        <button type="button" onClick={onDetail} className="shrink-0 p-1 text-muted-foreground" aria-label="상세">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
