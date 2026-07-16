"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminAssignCouponAction,
  adminDeactivateCouponAction,
  adminDeleteCouponAction,
  adminSearchCouponUsersAction,
  adminUpdateCouponAction,
} from "@/actions/admin-coupons";

export function CouponDetailActions({
  couponId,
  canWrite,
  canAssign,
  canDelete,
  active,
}: {
  couponId: string;
  canWrite: boolean;
  canAssign: boolean;
  canDelete: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; username: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await adminUpdateCouponAction(couponId, { active: !active });
                setMsg(res.error ?? (active ? "비활성화됨" : "활성화됨"));
                router.refresh();
              })
            }
          >
            {active ? "비활성화" : "활성화"}
          </Button>
        ) : null}
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await adminDeactivateCouponAction(couponId);
                setMsg("비활성화됨");
                router.refresh();
              })
            }
          >
            비활성화(감사)
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!confirm("쿠폰을 삭제할까요? 사용 내역도 함께 삭제됩니다.")) return;
                const res = await adminDeleteCouponAction(couponId);
                if (res.error) setMsg(res.error);
                else router.push("/admin/coupons");
              })
            }
          >
            삭제
          </Button>
        ) : null}
      </div>

      {canAssign ? (
        <div className="rounded-2xl border border-border/70 p-4 space-y-3">
          <h3 className="text-sm font-semibold">특정 크리에이터 / 회원 지급</h3>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="닉네임 · UID 검색"
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await adminSearchCouponUsersAction(q);
                  setHits(res.users ?? []);
                })
              }
            >
              검색
            </Button>
          </div>
          <ul className="max-h-40 space-y-1 overflow-auto text-sm">
            {hits.map((u) => {
              const on = selected.includes(u.username);
              return (
                <li key={u.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setSelected((prev) =>
                          on ? prev.filter((x) => x !== u.username) : [...prev, u.username]
                        )
                      }
                    />
                    @{u.username}
                  </label>
                </li>
              );
            })}
          </ul>

          <label className="block space-y-1 text-sm">
            <span>대량 지급 (줄바꿈 / 쉼표로 username·UID)</span>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-border bg-background p-2 text-sm"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"creator1\ncreator2"}
            />
          </label>

          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fromBulk = bulk
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const targets = [...new Set([...selected, ...fromBulk])];
                const res = await adminAssignCouponAction(couponId, targets);
                if (res.error) setMsg(res.error);
                else {
                  setMsg(`지급 ${res.created}명 (중복 스킵 ${res.skipped})`);
                  setSelected([]);
                  setBulk("");
                  router.refresh();
                }
              })
            }
          >
            쿠폰 지급
          </Button>
        </div>
      ) : null}

      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
