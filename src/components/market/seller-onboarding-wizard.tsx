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
  declareSellerSettlementForReview,
  startSellerSettlementOnboarding,
  submitSellerKyc,
  verifySellerEmailCode,
  type SellerSettlementPhase,
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
import {
  SELLER_KYC_ID_TYPES,
  SELLER_MARKETS,
  toSellerOnboardingUiStep,
  type SellerOnboardingStepId,
} from "@/lib/marketplace/seller-onboarding";
import { sellerRequiresPhoneVerification } from "@/lib/marketplace/seller-region-policy";
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
  const [settlementPhase, setSettlementPhase] = useState<SellerSettlementPhase>(
    initialState.signedIn && "settlementPhase" in initialState
      ? initialState.settlementPhase
      : null
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consentKind, setConsentKind] = useState<"terms" | "marketing" | "privacy" | null>(null);

  // Account form
  const [sellingMarket, setSellingMarket] = useState(() => {
    if (initialState.signedIn) {
      return (
        ("sellingMarket" in initialState && initialState.sellingMarket) ||
        initialState.countryCode ||
        "KR"
      );
    }
    return "KR";
  });
  const phoneRequired = sellerRequiresPhoneVerification(sellingMarket);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState(initialState.signedIn ? initialState.name ?? "" : "");
  const [email, setEmail] = useState(initialState.signedIn ? initialState.email ?? "" : "");
  const [phoneCountryCode, setPhoneCountryCode] = useState("KR");
  const [kycLegalName, setKycLegalName] = useState("");
  const [kycIdType, setKycIdType] = useState<(typeof SELLER_KYC_ID_TYPES)[number]["code"]>(
    "NATIONAL_ID"
  );
  const [kycIdNumber, setKycIdNumber] = useState("");

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
      if (next.signedIn && "settlementPhase" in next) {
        setSettlementPhase(next.settlementPhase);
      }
    });
  }

  async function handleRegister() {
    setError("");
    setMessage("");
    if (phoneRequired && (!phoneVerifiedOnForm || !phoneProof)) {
      setError("한국 판매자는 휴대폰(SMS) 인증이 필수입니다.");
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
        phoneCountryCode: phoneRequired ? "KR" : sellingMarket,
        phone: phoneRequired ? phone : undefined,
        phoneProof: phoneRequired ? phoneProof : undefined,
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
      setMessage(("message" in res && res.message) || "인증번호를 보냈습니다.");
      if ("devCode" in res && res.devCode) setPhoneCode(res.devCode);
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
      if (next.signedIn && "settlementPhase" in next) {
        setSettlementPhase(next.settlementPhase);
      }
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
      const res = await sendSellerPhoneOtp(phone, "KR");
      if (res.error) {
        setError(res.error);
        return;
      }
      if ("alreadyVerified" in res && res.alreadyVerified) {
        await advanceSellerPhoneStep("KR");
        setStep("SELLER_INFO");
        refreshState();
        return;
      }
      setPhoneSent(true);
      setMessage(("message" in res && res.message) || "인증번호를 보냈습니다.");
      if ("devCode" in res && res.devCode) setPhoneCode(res.devCode);
    });
  }

  async function handleVerifyPhone() {
    setError("");
    startTransition(async () => {
      const res = await verifySellerPhoneOtp(phone, phoneCode, "KR");
      if (res.error) {
        setError(res.error);
        return;
      }
      await advanceSellerPhoneStep("KR");
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
      if ("nextStep" in res && res.nextStep) {
        setStep(res.nextStep as SellerOnboardingStepId);
        if (res.nextStep === "SETTLEMENT") setSettlementPhase("stripe");
      }
      refreshState();
    });
  }

  async function handleKycSubmit() {
    setError("");
    startTransition(async () => {
      const res = await submitSellerKyc({
        legalName: kycLegalName,
        idType: kycIdType,
        idNumber: kycIdNumber,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res.success) {
        setStep("SETTLEMENT");
        setSettlementPhase("bank");
        refreshState();
      }
    });
  }

  async function handleConnect() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await startSellerSettlementOnboarding();
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
        return;
      }
      if ("message" in res && res.message) setMessage(res.message);
      if ("nextStep" in res && res.nextStep) {
        setStep(res.nextStep as SellerOnboardingStepId);
      } else {
        setStep("KYC");
      }
      refreshState();
    });
  }

  async function handleDeclareSettlement() {
    setError("");
    startTransition(async () => {
      const res = await declareSellerSettlementForReview("온보딩 정산 계좌 등록 검토 요청");
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

  const countryForSteps =
    ("sellingMarket" in state && state.sellingMarket) ||
    state.countryCode ||
    sellingMarket;

  // Logged-in users skip ACCOUNT; overseas skip PHONE
  let effectiveStep: SellerOnboardingStepId =
    state.signedIn && step === "ACCOUNT" ? "AGREEMENTS" : step;
  if (
    effectiveStep === "PHONE" &&
    !sellerRequiresPhoneVerification(countryForSteps)
  ) {
    effectiveStep = "SELLER_INFO";
  }

  const uiStep = toSellerOnboardingUiStep(
    effectiveStep,
    settlementPhase,
    countryForSteps
  );

  const title = useMemo(() => {
    if (effectiveStep === "ACCOUNT") return "MoCoMo MARKET과 함께 비즈니스를 시작하세요!";
    if (effectiveStep === "AGREEMENTS") return "약관 동의";
    if (effectiveStep === "EMAIL") return "이메일 인증";
    if (effectiveStep === "PHONE") return "휴대폰 인증";
    if (effectiveStep === "SELLER_INFO") return "판매자 정보";
    if (effectiveStep === "KYC") return "신분증 제출";
    if (effectiveStep === "SETTLEMENT") {
      return uiStep === "STRIPE" ? "Stripe Connect 시작" : "은행 계좌 등록";
    }
    return "가입 완료";
  }, [effectiveStep, uiStep]);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-center text-xl sm:text-2xl font-bold text-[#1a1a1a] mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        MoCoMo MARKET 판매자 온보딩 ·{" "}
        {phoneRequired
          ? "한국: 이메일+SMS+KYC+정산"
          : "해외: 이메일 → Stripe → 신분증 → 계좌 (SMS 없음)"}
      </p>

      <SellerOnboardingStepper uiStep={uiStep} countryCode={countryForSteps} />

      <div className="rounded-xl border border-[#d8dee6] bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        {effectiveStep === "ACCOUNT" && !state.signedIn && (
          <AccountStep
            sellingMarket={sellingMarket}
            setSellingMarket={(v) => {
              setSellingMarket(v);
              if (sellerRequiresPhoneVerification(v)) {
                setPhoneCountryCode("KR");
              } else {
                setPhoneVerifiedOnForm(false);
                setPhoneProof("");
                setPhoneSent(false);
              }
            }}
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
            phoneRequired={phoneRequired}
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
            <p className="text-sm text-muted-foreground">
              한국 판매자만 휴대폰(SMS) 인증이 필요합니다.
            </p>
            <label className="block text-sm font-medium">휴대폰번호</label>
            <div className="flex gap-2">
              <select
                value="KR"
                disabled
                className="h-10 rounded-md border border-input bg-background px-2 text-sm shrink-0"
              >
                <option value="KR">{sellerPhoneDialLabel("KR")}</option>
              </select>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={phonePlaceholderForCountry("KR")}
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
              한국(+82)만 지원 · 계정당 번호 1개
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
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {phoneRequired
                ? "한국 판매자: 본인 확인(KYC) 정보를 제출해 주세요. 관리자 검토 후 승인됩니다."
                : "해외 판매자: Stripe Connect 시작 후 정부 발급 신분증 정보를 제출해 주세요."}
            </p>
            <Input
              value={kycLegalName}
              onChange={(e) => setKycLegalName(e.target.value)}
              placeholder="법적 성명 (신분증과 동일)"
            />
            <select
              value={kycIdType}
              onChange={(e) =>
                setKycIdType(e.target.value as (typeof SELLER_KYC_ID_TYPES)[number]["code"])
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {SELLER_KYC_ID_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.labelKo}
                </option>
              ))}
            </select>
            <Input
              value={kycIdNumber}
              onChange={(e) => setKycIdNumber(e.target.value)}
              placeholder="신분증 번호 (저장 시 끝자리만 보관)"
            />
            <Button
              type="button"
              className="w-full"
              disabled={pending || !kycLegalName.trim() || kycIdNumber.trim().length < 4}
              onClick={handleKycSubmit}
            >
              신분증 제출하고 계좌 등록으로
            </Button>
          </div>
        )}

        {effectiveStep === "SETTLEMENT" && uiStep === "STRIPE" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              해외 판매자는 SMS 대신 Stripe Connect로 본인·정산을 진행합니다. Stripe가 아직
              연결되지 않아도 &quot;시작&quot;으로 기록한 뒤 신분증 제출로 이어집니다.
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Stripe Connect 시작</li>
              <li>신분증 제출</li>
              <li>은행 계좌 등록</li>
              <li>Stripe/관리자 승인</li>
            </ol>
            <Button type="button" className="w-full" disabled={pending} onClick={handleConnect}>
              Stripe Connect 시작
            </Button>
          </div>
        )}

        {effectiveStep === "SETTLEMENT" && uiStep !== "STRIPE" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {phoneRequired
                ? "정산 계좌 등록은 필수입니다. Stripe Connect로 연결하거나 관리자 검토 요청으로 제출할 수 있습니다."
                : "은행 계좌를 등록해 주세요. Stripe 승인·관리자 승인 전까지 상품 등록은 불가합니다."}
            </p>
            {phoneRequired && (
              <Button type="button" className="w-full" disabled={pending} onClick={handleConnect}>
                정산 계좌 연결 (Stripe Connect)
              </Button>
            )}
            <Button
              type="button"
              variant={phoneRequired ? "secondary" : "default"}
              className="w-full"
              disabled={pending}
              onClick={handleDeclareSettlement}
            >
              은행 계좌 등록 완료 · 검토 요청
            </Button>
            {(state.connectReady ||
              (state.signedIn && "settlementDeclared" in state && state.settlementDeclared)) && (
              <Button type="button" className="w-full" disabled={pending} onClick={handleComplete}>
                가입 신청 완료
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
  phoneRequired: boolean;
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
        <label className="block text-sm font-medium mb-1.5">판매 국가</label>
        <select
          value={props.sellingMarket}
          onChange={(e) => props.setSellingMarket(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {SELLER_MARKETS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.labelKo} ({m.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {props.phoneRequired
            ? "한국: 이메일 + 휴대폰(SMS) + KYC + 정산 필수"
            : "해외: 이메일 → Stripe Connect → 신분증 → 은행계좌 (SMS 없음)"}
        </p>
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

      {props.phoneRequired && (
        <div>
          <label className="block text-sm font-medium mb-1.5">휴대폰번호 (필수)</label>
          <div className="flex gap-2">
            <select
              value={props.phoneCountryCode}
              onChange={(e) => props.setPhoneCountryCode(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm shrink-0 max-w-[9.5rem]"
              disabled={props.phoneVerified}
            >
              {SELLER_PHONE_COUNTRIES.filter((c) => c.code === "KR").map((c) => (
                <option key={c.code} value={c.code}>
                  {sellerPhoneDialLabel(c.code)}
                </option>
              ))}
            </select>
            <Input
              value={props.phone}
              onChange={(e) => props.setPhone(e.target.value)}
              placeholder={phonePlaceholderForCountry("KR")}
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
        </div>
      )}

      <Button
        type="button"
        className="w-full h-11 mt-2"
        disabled={props.pending || (props.phoneRequired && !props.phoneVerified)}
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
