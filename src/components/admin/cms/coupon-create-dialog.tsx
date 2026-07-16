"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CouponAudience, CouponBenefitType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminCreateCouponAction } from "@/actions/admin-coupons";

export function CouponCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [autoLen, setAutoLen] = useState<8 | 10 | 12>(8);
  const [useAuto, setUseAuto] = useState(true);
  const [benefitType, setBenefitType] = useState<CouponBenefitType>("FEE_WAIVER");
  const [waiveUpToKrw, setWaiveUpToKrw] = useState(1_000_000);
  const [percentOff, setPercentOff] = useState(10);
  const [fixedDiscountKrw, setFixedDiscountKrw] = useState(10000);
  const [audience, setAudience] = useState<CouponAudience>("SPECIFIC_CREATORS");
  const [targetTier, setTargetTier] = useState("");
  const [unlimitedUses, setUnlimitedUses] = useState(false);
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);
  const [adminMemo, setAdminMemo] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 쿠폰 생성</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span>쿠폰명</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Creator Welcome" />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useAuto} onChange={(e) => setUseAuto(e.target.checked)} />
              코드 자동 생성
            </label>
            {useAuto ? (
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={autoLen}
                onChange={(e) => setAutoLen(Number(e.target.value) as 8 | 10 | 12)}
              >
                <option value={8}>8자리</option>
                <option value={10}>10자리</option>
                <option value={12}>12자리</option>
              </select>
            ) : (
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DNBKEHSWU"
              />
            )}
          </div>

          <fieldset className="space-y-1">
            <legend className="text-xs text-muted-foreground">혜택 종류</legend>
            {(
              [
                ["FEE_WAIVER", "수수료 면제"],
                ["FEE_PERCENT_OFF", "수수료 할인(%)"],
                ["FIXED_AMOUNT", "고정금액 할인"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="benefit"
                  checked={benefitType === id}
                  onChange={() => setBenefitType(id)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {benefitType === "FEE_WAIVER" ? (
            <label className="block space-y-1">
              <span>면제 한도 (원) — 예: 첫 1,000,000원</span>
              <Input
                type="number"
                value={waiveUpToKrw}
                onChange={(e) => setWaiveUpToKrw(Number(e.target.value))}
              />
            </label>
          ) : null}
          {benefitType === "FEE_PERCENT_OFF" ? (
            <label className="block space-y-1">
              <span>할인율 (%)</span>
              <Input
                type="number"
                value={percentOff}
                onChange={(e) => setPercentOff(Number(e.target.value))}
              />
            </label>
          ) : null}
          {benefitType === "FIXED_AMOUNT" ? (
            <label className="block space-y-1">
              <span>고정 할인 (원)</span>
              <Input
                type="number"
                value={fixedDiscountKrw}
                onChange={(e) => setFixedDiscountKrw(Number(e.target.value))}
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span>적용 대상</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={audience}
              onChange={(e) => setAudience(e.target.value as CouponAudience)}
            >
              <option value="ALL_USERS">모든 회원</option>
              <option value="SPECIFIC_USERS">특정 회원</option>
              <option value="SPECIFIC_CREATORS">특정 크리에이터</option>
              <option value="SPECIFIC_TIER">특정 등급</option>
            </select>
          </label>
          {audience === "SPECIFIC_TIER" ? (
            <Input
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              placeholder="예: PREMIUM / GOLD"
            />
          ) : null}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={unlimitedUses}
              onChange={(e) => setUnlimitedUses(e.target.checked)}
            />
            사용 횟수 무제한 (체크 해제 시 1회)
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span>시작</span>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span>종료 (선택)</span>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            활성
          </label>

          <label className="block space-y-1">
            <span>관리자 메모</span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-border bg-background p-2"
              value={adminMemo}
              onChange={(e) => setAdminMemo(e.target.value)}
            />
          </label>

          {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}

          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await adminCreateCouponAction({
                  name,
                  code: useAuto ? undefined : code,
                  autoCodeLength: autoLen,
                  benefitType,
                  waiveUpToKrw,
                  percentOff,
                  fixedDiscountKrw,
                  audience,
                  targetTier: targetTier || undefined,
                  maxUsesPerUser: unlimitedUses ? null : 1,
                  startsAt: new Date(startsAt).toISOString(),
                  endsAt: endsAt ? new Date(endsAt).toISOString() : null,
                  active,
                  adminMemo,
                });
                if (res.error) {
                  setMsg(res.error);
                  return;
                }
                setMsg("생성됨");
                onOpenChange(false);
                if (res.id) router.push(`/admin/coupons/${res.id}`);
                else router.refresh();
              })
            }
          >
            {pending ? "생성 중…" : "쿠폰 생성"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
