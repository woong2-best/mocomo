"use client";

import { signIn } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, prepareSignupVerify } from "@/actions/auth";
import { AptFloorPicker } from "@/components/apt/apt-floor-picker";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { saveSignupDraft, saveSignupChallenge } from "@/lib/signup-draft";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { COUNTRIES, LOCALE_COOKIE, COUNTRY_COOKIE, LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { isValidSignupEmail } from "@/lib/signup-email-domains";
import { EmailAddressField } from "@/components/auth/email-address-field";
import { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";

const DISPLAY_NAME_COUNTRY_PREFIX: Record<string, string> = {
  KR: "korea",
  US: "usa",
  JP: "japan",
  CN: "china",
  TW: "taiwan",
  TH: "thailand",
  VN: "vietnam",
  PH: "philippines",
  ID: "indonesia",
  GB: "uk",
  DE: "germany",
  FR: "france",
  CA: "canada",
  AU: "australia",
  OTHER: "global",
};

function displayNameForApt(countryCode: string, homeFloor: number) {
  const prefix =
    DISPLAY_NAME_COUNTRY_PREFIX[countryCode.toUpperCase()] ??
    countryCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${prefix}${homeFloor}`;
}

export function SignupApplyForm({
  googleOAuth,
  discordOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("ko");
  const [countryCode, setCountryCode] = useState("KR");
  const [homeFloor, setHomeFloor] = useState(APT_DEFAULT_FLOOR);
  const [floorTaken, setFloorTaken] = useState(false);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [signatureSigned, setSignatureSigned] = useState(false);

  const showSocial = googleOAuth || discordOAuth;
  const needsHumanVerify = isSignupHumanVerifyRequired();
  const countryLabel = `${findCountry(countryCode)?.nameKo ?? countryCode} APT`;
  const autoDisplayName = displayNameForApt(countryCode, homeFloor);

  const prepareSignatureCanvas = useCallback(() => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#020617";
  }, []);

  useEffect(() => {
    prepareSignatureCanvas();
    window.addEventListener("resize", prepareSignatureCanvas);
    return () => window.removeEventListener("resize", prepareSignatureCanvas);
  }, [prepareSignatureCanvas]);

  const handleFloorChange = useCallback((next: number) => {
    setHomeFloor(next);
  }, []);

  const drawSignature = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureRef.current;
    if (!canvas || !drawingRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#020617";
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
    setSignatureSigned(true);
  }, []);

  const beginSignature = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }, []);

  const endSignature = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = signatureRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    prepareSignatureCanvas();
    setSignatureSigned(false);
  }, [prepareSignatureCanvas]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim().toLowerCase();
    if (!isValidSignupEmail(email)) {
      setError("올바른 이메일을 입력해 주세요. (아이디 @ 도메인)");
      setLoading(false);
      return;
    }
    const password = form.get("password") as string;
    const username = ((form.get("username") as string) || "").trim().toLowerCase();
    const displayName = autoDisplayName;

    if (
      containsForbiddenAdminSequence(username) ||
      (displayName && containsForbiddenAdminSequence(displayName))
    ) {
      setError(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      setLoading(false);
      return;
    }

    if (floorTaken) {
      setError("선택한 층은 이미 입주 중입니다. 다른 층을 선택해 주세요.");
      setLoading(false);
      return;
    }

    if (!signatureSigned) {
      setError("계약서 하단에 손가락으로 서명해 주세요.");
      setLoading(false);
      return;
    }

    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
      document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;

      const check = await prepareSignupVerify({
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        homeFloor,
        website: (form.get("website") as string) || undefined,
      });

      if (!("ok" in check) || !check.ok) {
        const msg = "error" in check && check.error ? check.error : "가입 정보를 확인할 수 없습니다.";
        setError(msg);
        if (msg.includes("입주 중")) setFloorTaken(true);
        return;
      }

      if (check.message) setNotice(check.message);

      const draft = {
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        homeFloor,
      };

      if (needsHumanVerify) {
        saveSignupDraft(draft);
        if ("challenge" in check && check.challenge) {
          saveSignupChallenge(check.challenge);
        }
        router.prefetch("/auth/signup/verify");
        router.prefetch(
          `/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`
        );
        router.replace("/auth/signup/verify");
        return;
      }

      const result = await registerUser({
        ...draft,
        turnstileUnavailable: true,
      });

      if (result.error) {
        setError(result.error);
        if (result.error.includes("입주 중")) setFloorTaken(true);
        return;
      }

      if (result.needsVerification) {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.push(`/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`);
      }
    } catch {
      setError("서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-[#eef3f5] px-3 py-4 sm:px-4">
      <div className="mx-auto max-w-md">
        <div className="mb-3 rounded-[2rem] border-4 border-slate-900 bg-white px-4 py-3 shadow-[0_8px_0_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-slate-900 bg-white p-1">
                <BrandLogo size={40} priority />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Real Estate</p>
                <h1 className="text-xl font-black text-slate-950">MOCOMO 입주 계약서</h1>
              </div>
            </div>
            <SignupStepIndicator step={1} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            계약서를 작성하면 국가별 아파트의 빈 층을 배정받고, 이메일 인증 후 이사 연출이 시작됩니다.
          </p>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-4 border-slate-900 bg-[#fffdf5] shadow-2xl">
          <CardHeader className="border-b-4 border-slate-900 bg-white/70 text-center">
            <CardTitle className="text-lg font-black text-slate-950">임대차 계약 정보</CardTitle>
            <p className="text-xs text-muted-foreground">
              이메일 인증, 재전송, 비밀번호 찾기는 기존 계정 시스템과 그대로 연결됩니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
            <EmailAddressField required />
            <Input
              name="username"
              placeholder="닉네임 (영문·숫자·_)"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="rounded-xl"
            />
            <Input
              name="name"
              value={autoDisplayName}
              readOnly
              aria-readonly="true"
              autoComplete="name"
              className="rounded-xl bg-slate-100 font-black text-slate-900"
            />
            <Input
              name="password"
              type="password"
              placeholder="비밀번호 (8자 이상)"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl"
            />

            <div className="rounded-2xl border-2 border-slate-900 bg-white p-3">
              <p className="mb-2 text-xs font-black text-slate-800">국가별 APT 선택</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountryCode(c.code)}
                    className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-black transition ${
                      countryCode === c.code
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {c.nameKo}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">언어</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                >
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border-2 border-slate-900 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-slate-800">아파트 입주 층</p>
                <p className="text-[10px] font-bold text-slate-500">국가별 1~{APT_TOTAL_FLOORS}층</p>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {[1, 100, 300, 500, 700, APT_TOTAL_FLOORS].map((floor) => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setHomeFloor(floor)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-black text-slate-700"
                  >
                    {floor}층
                  </button>
                ))}
              </div>
              <AptFloorPicker
                countryCode={countryCode}
                countryLabel={countryLabel}
                floor={homeFloor}
                onFloorChange={handleFloorChange}
                onTakenChange={setFloorTaken}
                compact
              />
            </div>

            <div className="rounded-2xl border-2 border-slate-900 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-slate-800">입주자 서명</p>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[10px] font-bold text-slate-500 underline"
                >
                  다시 쓰기
                </button>
              </div>
              <div className="relative overflow-hidden rounded-2xl border-4 border-slate-950 bg-[#fffaf0]">
                <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-black" />
                  검은 잉크 펜
                </div>
                {!signatureSigned && (
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 text-[11px] font-bold text-slate-500">
                    이 칸에 바로 손가락으로 서명하세요
                  </div>
                )}
                <canvas
                  ref={signatureRef}
                  onPointerDown={beginSignature}
                  onPointerMove={drawSignature}
                  onPointerUp={endSignature}
                  onPointerLeave={endSignature}
                  onPointerCancel={endSignature}
                  className="block h-36 w-full touch-none bg-transparent"
                  aria-label="입주 계약서 서명"
                />
                <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b-2 border-dashed border-slate-300" />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">스마트폰 화면에 손가락으로 직접 서명하세요.</p>
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-hidden
            />

            {notice && (
              <p className="text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                {notice}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              회원가입 시{" "}
              <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                이용약관
              </Link>
              ,{" "}
              <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                개인정보처리방침
              </Link>
              ,{" "}
              <Link href="/legal/policy" className="text-primary hover:underline" target="_blank">
                운영정책
              </Link>
              에 동의한 것으로 간주됩니다.
            </p>

            <Button type="submit" className="w-full rounded-2xl border-2 border-slate-950 bg-slate-950 py-6 text-base font-black" disabled={loading || floorTaken}>
              {loading
                ? "확인 중..."
                : needsHumanVerify
                  ? "다음 · 사람 확인"
                  : "계약서 제출 · 인증 메일 받기"}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  또는 소셜로 가입 (층은 입주 단계에서 선택)
                </div>
              </div>
              <div className="space-y-2">
                {discordOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => signIn("discord", { callbackUrl: "/apt/move-in" })}
                  >
                    Discord로 가입
                  </Button>
                )}
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => signIn("google", { callbackUrl: "/apt/move-in" })}
                  >
                    Google로 가입
                  </Button>
                )}
              </div>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link href="/auth/signin" className="text-folk-cobalt hover:underline font-medium">
              로그인
            </Link>
          </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
