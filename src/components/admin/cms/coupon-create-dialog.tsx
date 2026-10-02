"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
          <DialogTitle>{t("admin.s2erxkc")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span>{t("admin.svh6yd")}</span>
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
                <option value={8}>{t("admin.s1047o")}</option>
                <option value={10}>{t("admin.s1v8mz")}</option>
                <option value={12}>{t("admin.s1va4d")}</option>
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
            <legend className="text-xs text-muted-foreground">{t("admin.sb5vdma")}</legend>
            {(
              [
                ["FEE_WAIVER", t("admin.sfmsbgc")],
                ["FEE_PERCENT_OFF", t("admin.s620leo")],
                ["FIXED_AMOUNT", t("admin.sngu2p6")],
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
              <span>{t("admin.1_000_000")}</span>
              <Input
                type="number"
                value={waiveUpToKrw}
                onChange={(e) => setWaiveUpToKrw(Number(e.target.value))}
              />
            </label>
          ) : null}
          {benefitType === "FEE_PERCENT_OFF" ? (
            <label className="block space-y-1">
              <span>{t("admin.s1gj60fw")}</span>
              <Input
                type="number"
                value={percentOff}
                onChange={(e) => setPercentOff(Number(e.target.value))}
              />
            </label>
          ) : null}
          {benefitType === "FIXED_AMOUNT" ? (
            <label className="block space-y-1">
              <span>{t("admin.s1oq0hj8")}</span>
              <Input
                type="number"
                value={fixedDiscountKrw}
                onChange={(e) => setFixedDiscountKrw(Number(e.target.value))}
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span>{t("admin.spr2wwp")}</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={audience}
              onChange={(e) => setAudience(e.target.value as CouponAudience)}
            >
              <option value="ALL_USERS">{t("admin.s16csuy4")}</option>
              <option value="SPECIFIC_USERS">{t("admin.s1vugv6w")}</option>
              <option value="SPECIFIC_CREATORS">{t("admin.s1bj4x4")}</option>
              <option value="SPECIFIC_TIER">{t("admin.s1vub0ik")}</option>
            </select>
          </label>
          {audience === "SPECIFIC_TIER" ? (
            <Input
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              placeholder={t("admin.premium_gold")}
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
              <span>{t("explore.start")}</span>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span>{t("admin.s1emp9j1")}</span>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            활성
          </label>

          <label className="block space-y-1">
            <span>{t("admin.s1jy8b2o")}</span>
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
                  setMsg(errorText(res.error));
                  return;
                }
                setMsg(t("admin.st6t9w"));
                onOpenChange(false);
                if (res.id) router.push(`/admin/coupons/${res.id}`);
                else router.refresh();
              })
            }
          >
            {pending ? t("communities.s1w6bzz5") : t("admin.s1m7d1xg")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
