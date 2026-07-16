"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  adminCreateSettlementAction,
  adminTransitionSettlementAction,
} from "@/actions/admin-settlements";
import { adminPreviewSettlementBenefitsAction } from "@/actions/admin-promotions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettlementStatus } from "@prisma/client";

type Row = {
  id: string;
  status: SettlementStatus;
  title: string | null;
  grossAmountKrw: number;
  discountAmountKrw: number;
  feeAmountKrw: number;
  netAmountKrw: number;
  createdAt: Date | string;
  user: { username: string; id: string };
  _count: { items: number; history: number };
};

const STATUS_OPTS: SettlementStatus[] = [
  "PENDING",
  "REVIEW",
  "APPROVED",
  "REJECTED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
];

export function AdminSettlementsPanel({
  items,
  total,
  page,
  totalPages,
  statusFilter,
}: {
  items: Row[];
  total: number;
  page: number;
  totalPages: number;
  statusFilter?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState("");
  const [gross, setGross] = useState("4500000");
  const [preview, setPreview] = useState<{
    grossAmountKrw: number;
    discountAmountKrw: number;
    sellerAmountKrw: number;
    feeAfterKrw: number;
    appliedPromotion: { name: string } | null;
    appliedPromotions?: { name: string }[];
    appliedCoupon: unknown;
    steps: { label: string; saved: number }[];
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userId.trim() || Number(gross) <= 0) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      void adminPreviewSettlementBenefitsAction(userId.trim(), Number(gross)).then((res) => {
        if (res.ok) {
          setPreview({
            grossAmountKrw: res.data.grossAmountKrw,
            discountAmountKrw: res.data.discountAmountKrw,
            sellerAmountKrw: res.data.sellerAmountKrw,
            feeAfterKrw: res.data.feeAfterKrw,
            appliedPromotion: res.data.appliedPromotion
              ? { name: res.data.appliedPromotion.name }
              : null,
            appliedPromotions: res.data.appliedPromotions?.map((p) => ({ name: p.name })),
            appliedCoupon: res.data.appliedCoupon,
            steps: res.data.steps,
          });
        } else setPreview(null);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [userId, gross]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">정산 미리보기 · 초안 생성</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>유저 ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="cuid" />
          </div>
          <div>
            <Label>총 수익(원)</Label>
            <Input value={gross} onChange={(e) => setGross(e.target.value)} type="number" />
          </div>
        </div>

        {preview ? (
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
            <p>
              총 수익{" "}
              <strong>₩{preview.grossAmountKrw.toLocaleString()}</strong>
            </p>
            <p>
              적용될 Promotion{" "}
              <strong>
                {preview.appliedPromotions?.length
                  ? preview.appliedPromotions.map((p) => p.name).join(" + ")
                  : preview.appliedPromotion?.name ?? "없음"}
              </strong>
              {preview.appliedCoupon ? " · Coupon 병행" : ""}
            </p>
            <p>
              절감 금액{" "}
              <strong>₩{preview.discountAmountKrw.toLocaleString()}</strong>
            </p>
            <p>
              수수료(적용 후) ₩{preview.feeAfterKrw.toLocaleString()}
            </p>
            <p>
              예상 지급액{" "}
              <strong>₩{preview.sellerAmountKrw.toLocaleString()}</strong>
            </p>
            {preview.steps.length > 0 ? (
              <ul className="text-xs text-muted-foreground pt-1">
                {preview.steps.map((s, i) => (
                  <li key={i}>
                    {s.label}: −₩{s.saved.toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">유저 ID와 금액을 입력하면 실시간 계산됩니다.</p>
        )}

        <Button
          type="button"
          disabled={pending || !userId.trim() || Number(gross) <= 0}
          onClick={() =>
            start(async () => {
              const res = await adminCreateSettlementAction({
                userId: userId.trim(),
                grossAmountKrw: Number(gross),
                title: "관리자 정산 초안",
              });
              if (res.error) setMsg(res.error);
              else {
                setMsg(`초안 생성: ${res.id}`);
                router.refresh();
              }
            })
          }
        >
          정산 초안 생성
        </Button>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={!statusFilter ? "default" : "outline"}
          size="sm"
          onClick={() => router.push("/admin/settlements")}
        >
          전체
        </Button>
        {STATUS_OPTS.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => router.push(`/admin/settlements?status=${s}`)}
          >
            {s}
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}건</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">유저</th>
              <th className="p-3">상태</th>
              <th className="p-3">총수익</th>
              <th className="p-3">절감</th>
              <th className="p-3">지급액</th>
              <th className="p-3">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="p-3">
                  <Link href={`/admin/settlements/${s.id}`} className="hover:underline">
                    @{s.user.username}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs">{s.status}</td>
                <td className="p-3">₩{s.grossAmountKrw.toLocaleString()}</td>
                <td className="p-3">₩{s.discountAmountKrw.toLocaleString()}</td>
                <td className="p-3 font-medium">₩{s.netAmountKrw.toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {s.status === "PENDING" || s.status === "REVIEW" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              await adminTransitionSettlementAction(s.id, "APPROVED");
                              router.refresh();
                            })
                          }
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              await adminTransitionSettlementAction(s.id, "REJECTED");
                              router.refresh();
                            })
                          }
                        >
                          거절
                        </Button>
                      </>
                    ) : null}
                    {s.status === "APPROVED" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await adminTransitionSettlementAction(s.id, "PROCESSING");
                            router.refresh();
                          })
                        }
                      >
                        처리중
                      </Button>
                    ) : null}
                    {s.status === "PROCESSING" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await adminTransitionSettlementAction(s.id, "PAID");
                            router.refresh();
                          })
                        }
                      >
                        지급완료
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  정산 내역이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              router.push(
                `/admin/settlements?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`
              )
            }
          >
            이전
          </Button>
          <span className="self-center text-sm">
            {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `/admin/settlements?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`
              )
            }
          >
            다음
          </Button>
        </div>
      ) : null}
    </div>
  );
}
