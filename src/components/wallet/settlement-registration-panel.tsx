"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { registerCreatorSettlement } from "@/actions/settlement-register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KR_BANK_CATALOG } from "@/lib/apick/bank-catalog";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";

type Props = {
  registered: boolean;
  payoutsEnabled: boolean;
  profile: {
    countryCode: string;
    legalName: string;
    accountNumberLast4: string;
    accountHolderName: string;
    bankCode: string | null;
    taxFormType: string;
  } | null;
  defaultCountry?: string;
  requestCardPayments?: boolean;
  className?: string;
};

const COUNTRIES = [
  { code: "KR", label: "한국" },
  { code: "US", label: "미국" },
  { code: "JP", label: "일본" },
];

export function SettlementRegistrationPanel({
  registered,
  payoutsEnabled,
  profile,
  defaultCountry = "KR",
  requestCardPayments = false,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countryCode, setCountryCode] = useState(profile?.countryCode ?? defaultCountry);
  const [legalName, setLegalName] = useState(profile?.legalName ?? "");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bankCode, setBankCode] = useState(profile?.bankCode ?? "");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState(profile?.accountHolderName ?? "");
  const [ssn, setSsn] = useState("");
  const [taxAccepted, setTaxAccepted] = useState(false);

  const isUs = countryCode === "US";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await registerCreatorSettlement({
        countryCode,
        legalName,
        birthYear: Number(birthYear),
        birthMonth: Number(birthMonth),
        birthDay: Number(birthDay),
        addressLine1,
        city,
        state: state || undefined,
        postalCode,
        accountNumber,
        accountHolderName,
        bankCode: countryCode === "KR" ? bankCode : undefined,
        routingNumber: countryCode === "US" ? routingNumber : undefined,
        taxAttestationAccepted: taxAccepted as true,
        ssn: isUs ? ssn : undefined,
        requestCardPayments,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSuccess(
        res.payoutsEnabled
          ? `${REWARD_TERMS_LABEL} 정산 등록이 완료되었습니다.`
          : "정산 등록이 접수되었습니다. 확인 후 Reward 지급이 활성화됩니다."
      );
      router.refresh();
    });
  }

  if (registered && payoutsEnabled && profile) {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="font-bold">Reward 정산 등록 완료</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">{profile.legalName}</p>
          <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-1">
            {profile.countryCode === "KR" && profile.bankCode
              ? `${KR_BANK_CATALOG.find((b) => b.code === profile.bankCode)?.name ?? profile.bankCode} `
              : ""}
            ****{profile.accountNumberLast4} · {profile.accountHolderName}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            월말에 정산 MOCO가 {REWARD_TERMS_LABEL}로 자동 지급됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-4", className)}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="font-bold">Reward 정산 등록</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Stripe 방문 없이 MoCoMo에서 계좌·본인 정보를 입력하면 정산 등록이 완료됩니다. 월말에{" "}
        {REWARD_TERMS_LABEL}가 등록 계좌로 자동 입금됩니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">국가</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">실명</span>
          <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">생년</span>
          <Input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required inputMode="numeric" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">월</span>
          <Input value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required inputMode="numeric" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">일</span>
          <Input value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required inputMode="numeric" />
        </label>
      </div>

      <label className="space-y-1 text-sm block">
        <span className="text-muted-foreground">주소</span>
        <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">도시</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">주/도</span>
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">우편번호</span>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
        </label>
      </div>

      {countryCode === "KR" ? (
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">은행</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            required
          >
            <option value="">은행 선택</option>
            {KR_BANK_CATALOG.filter((b) => b.apickSupported).map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : countryCode === "US" ? (
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Routing Number</span>
          <Input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} required />
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">계좌번호</span>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">예금주</span>
          <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} required />
        </label>
      </div>

      {isUs ? (
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">SSN / ITIN (W-9)</span>
          <Input
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            required
            placeholder="XXX-XX-XXXX"
            autoComplete="off"
          />
        </label>
      ) : (
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={taxAccepted}
            onChange={(e) => setTaxAccepted(e.target.checked)}
            required
          />
          <span>
            본인은 미국 세법상 미국 거주자(US Person)가 아니며, 금융 정보 제공 및 W-8BEN에 동의합니다.
          </span>
        </label>
      )}

      {isUs ? (
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={taxAccepted}
            onChange={(e) => setTaxAccepted(e.target.checked)}
            required
          />
          <span>본인은 미국 거주자이며, W-9 및 금융 정보 제공에 동의합니다.</span>
        </label>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "등록 중…" : "Reward 정산 등록 완료"}
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </form>
  );
}
