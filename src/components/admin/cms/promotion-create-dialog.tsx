"use client";

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
        trigger,
        rules,
        scheduledAt: String(fd.get("scheduledAt") || "") || null,
        startsAt: String(fd.get("startsAt") || new Date().toISOString()),
        endsAt: String(fd.get("endsAt") || "") || null,
        maxUsesPerUser: Number(fd.get("maxUsesPerUser") || 1),
        adminMemo: String(fd.get("adminMemo") || "") || undefined,
      });
      if (res.error) {
        setError(res.error);
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
          <DialogTitle>프로모션 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" required placeholder="Creator Welcome" />
          </div>
          <div>
            <Label htmlFor="slug">slug (선택)</Label>
            <Input id="slug" name="slug" placeholder="creator-welcome" />
          </div>
          <div>
            <Label htmlFor="description">설명</Label>
            <Input id="description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>혜택 유형</Label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={benefitType}
                onChange={(e) => setBenefitType(e.target.value as CouponBenefitType)}
              >
                <option value="FEE_WAIVER">수수료 면제</option>
                <option value="FEE_PERCENT_OFF">수수료 %</option>
                <option value="FIXED_AMOUNT">고정 할인</option>
              </select>
            </div>
            <div>
              <Label htmlFor="priority">우선순위 (낮을수록 우선)</Label>
              <Input id="priority" name="priority" type="number" defaultValue={100} />
            </div>
          </div>
          {benefitType === "FEE_WAIVER" ? (
            <div>
              <Label htmlFor="waiveUpToKrw">면제 한도(원)</Label>
              <Input id="waiveUpToKrw" name="waiveUpToKrw" type="number" defaultValue={100000} />
            </div>
          ) : null}
          {benefitType === "FEE_PERCENT_OFF" ? (
            <div>
              <Label htmlFor="percentOff">할인 %</Label>
              <Input id="percentOff" name="percentOff" type="number" defaultValue={50} />
            </div>
          ) : null}
          {benefitType === "FIXED_AMOUNT" ? (
            <div>
              <Label htmlFor="fixedDiscountKrw">고정 할인(원)</Label>
              <Input id="fixedDiscountKrw" name="fixedDiscountKrw" type="number" defaultValue={10000} />
            </div>
          ) : null}
          <div>
            <Label>자동 지급 트리거</Label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as PromotionTrigger)}
            >
              <option value="MANUAL">수동</option>
              <option value="ON_SIGNUP">가입 시</option>
              <option value="ON_FIRST_LIVE">첫 라이브</option>
              <option value="ON_FIRST_SALE">첫 판매</option>
              <option value="ON_EVENT">이벤트</option>
              <option value="SCHEDULED_DATE">예약 날짜</option>
              <option value="CRON_RULE">Cron 규칙</option>
            </select>
          </div>
          {trigger === "SCHEDULED_DATE" ? (
            <div>
              <Label htmlFor="scheduledAt">예약 시각</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startsAt">시작</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <Label htmlFor="endsAt">종료</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-medium">조건부 지급 규칙</p>
            <div>
              <Label htmlFor="minFollowers">최소 팔로워</Label>
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
            <Label htmlFor="maxUsesPerUser">1인 최대 사용</Label>
            <Input id="maxUsesPerUser" name="maxUsesPerUser" type="number" defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="adminMemo">관리자 메모</Label>
            <Input id="adminMemo" name="adminMemo" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "생성 중…" : "생성"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
