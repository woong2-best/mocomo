"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CouponBenefitType, PromotionTrigger } from "@prisma/client";
import { adminCreatePromotionAction } from "@/actions/admin-promotions";
import type { PromotionRule } from "@/lib/promotion/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PromotionCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [benefitType, setBenefitType] = useState<CouponBenefitType>("FEE_WAIVER");
  const [trigger, setTrigger] = useState<PromotionTrigger>("MANUAL");
  const [minFollowers, setMinFollowers] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rules: PromotionRule[] = [];
    const mf = Number(minFollowers);
    if (mf > 0) rules.push({ type: "MIN_FOLLOWERS", value: mf });
    if (fd.get("creatorOnly") === "on") {
      rules.push({ type: "CREATOR_APPROVED", value: true });
    }
    if (fd.get("premiumOnly") === "on") {
      rules.push({ type: "PREMIUM", value: true });
    }

    start(async () => {
      setError(null);
      const res = await adminCreatePromotionAction({
        name: String(fd.get("name") || ""),
        slug: String(fd.get("slug") || "") || undefined,
        description: String(fd.get("description") || "") || undefined,
        benefitType,
        waiveUpToKrw: Number(fd.get("waiveUpToKrw") || 0) || undefined,
        percentOff: Number(fd.get("percentOff") || 0) || undefined,
        fixedDiscountKrw: Number(fd.get("fixedDiscountKrw") || 0) || undefined,
        priority: Number(fd.get("priority") || 100),
        stackable: fd.get("stackable") === "on",
        allowDuplicate: fd.get("allowDuplicate") === "on",
        maxStackPerSettlement: Number(fd.get("maxStackPerSettlement") || 1),
        trigger,
        rules,
        scheduledAt: String(fd.get("scheduledAt") || "") || null,
        startsAt: String(fd.get("startsAt") || new Date().toISOString()),
        endsAt: String(fd.get("endsAt") || "") || null,
        maxUsesPerUser: Number(fd.get("maxUsesPerUser") || 1),
        adminMemo: String(fd.get("adminMemo") || "") || undefined,
      });
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      onOpenChange(false);
      if (res.id) router.push(`/admin/promotions/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.s16p88ek")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="name">{t("market.name")}</Label>
            <Input id="name" name="name" required placeholder="Creator Welcome" />
          </div>
          <div>
            <Label htmlFor="slug">{t("admin.slug_2")}</Label>
            <Input id="slug" name="slug" placeholder="creator-welcome" />
          </div>
          <div>
            <Label htmlFor="description">{t("community-server.sxvj5")}</Label>
            <Input id="description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("admin.sb5var8")}</Label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={benefitType}
                onChange={(e) => setBenefitType(e.target.value as CouponBenefitType)}
              >
                <option value="FEE_WAIVER">{t("admin.sfmsbgc")}</option>
                <option value="FEE_PERCENT_OFF">{t("admin.s2sm1u9")}</option>
                <option value="FIXED_AMOUNT">{t("admin.s1pxa6zn")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="priority">{t("admin.syq3z84")}</Label>
              <Input id="priority" name="priority" type="number" defaultValue={100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="maxStackPerSettlement">{t("admin.s1tyxc93")}</Label>
              <Input
                id="maxStackPerSettlement"
                name="maxStackPerSettlement"
                type="number"
                defaultValue={1}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="stackable" /> Stack 가능
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowDuplicate" /> 중복 적용 허용
          </label>
          {benefitType === "FEE_WAIVER" ? (
            <div>
              <Label htmlFor="waiveUpToKrw">{t("admin.s171pyn5")}</Label>
              <Input id="waiveUpToKrw" name="waiveUpToKrw" type="number" defaultValue={100000} />
            </div>
          ) : null}
          {benefitType === "FEE_PERCENT_OFF" ? (
            <div>
              <Label htmlFor="percentOff">{t("admin.srq2kv1")}</Label>
              <Input id="percentOff" name="percentOff" type="number" defaultValue={50} />
            </div>
          ) : null}
          {benefitType === "FIXED_AMOUNT" ? (
            <div>
              <Label htmlFor="fixedDiscountKrw">{t("admin.s1e3o0ji")}</Label>
              <Input id="fixedDiscountKrw" name="fixedDiscountKrw" type="number" defaultValue={10000} />
            </div>
          ) : null}
          <div>
            <Label>{t("admin.s14uncrg")}</Label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as PromotionTrigger)}
            >
              <option value="MANUAL">{t("admin.sy01t")}</option>
              <option value="ON_SIGNUP">{t("admin.smi8nwh")}</option>
              <option value="ON_FIRST_LIVE">{t("admin.sjp2kdb")}</option>
              <option value="ON_FIRST_SALE">{t("admin.spud2ll")}</option>
              <option value="ON_EVENT">{t("lib.payment.history.sbff20dc3bb")}</option>
              <option value="SCHEDULED_DATE">{t("admin.shw2wg7")}</option>
              <option value="CRON_RULE">{t("admin.cron")}</option>
            </select>
          </div>
          {trigger === "SCHEDULED_DATE" ? (
            <div>
              <Label htmlFor="scheduledAt">{t("admin.shw5u7k")}</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startsAt">{t("explore.start")}</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <Label htmlFor="endsAt">{t("lib.subculture.event.phase.scafdc61bbf")}</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-medium">{t("admin.s1gv613k")}</p>
            <div>
              <Label htmlFor="minFollowers">{t("admin.s6yz7o4")}</Label>
              <Input
                id="minFollowers"
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value)}
                type="number"
                placeholder="5000"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="creatorOnly" /> 크리에이터만
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="premiumOnly" /> 프리미엄만
            </label>
          </div>
          <div>
            <Label htmlFor="maxUsesPerUser">{t("admin.syezaww")}</Label>
            <Input id="maxUsesPerUser" name="maxUsesPerUser" type="number" defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="adminMemo">{t("admin.s1jy8b2o")}</Label>
            <Input id="adminMemo" name="adminMemo" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t("communities.s1w6bzz5") : t("community-server.sxv5g")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
