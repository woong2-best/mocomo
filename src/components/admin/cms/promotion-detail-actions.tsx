"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminAssignPromotionAction,
  adminDeletePromotionAction,
  adminUpdatePromotionAction,
} from "@/actions/admin-promotions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PromotionDetailActions({
  promotionId,
  active,
  priority,
  canWrite,
  canAssign,
  canDelete,
}: {
  promotionId: string;
  active: boolean;
  priority: number;
  canWrite: boolean;
  canAssign: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [targets, setTargets] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [prio, setPrio] = useState(String(priority));

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      {canWrite ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>우선순위</Label>
            <Input
              value={prio}
              onChange={(e) => setPrio(e.target.value)}
              type="number"
              className="w-28"
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await adminUpdatePromotionAction(promotionId, {
                  priority: Number(prio),
                });
                router.refresh();
              })
            }
          >
            우선순위 저장
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await adminUpdatePromotionAction(promotionId, { active: !active });
                router.refresh();
              })
            }
          >
            {active ? "비활성화" : "활성화"}
          </Button>
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!confirm("프로모션을 삭제할까요?")) return;
                  const res = await adminDeletePromotionAction(promotionId);
                  if (res.error) setMsg(res.error);
                  else router.push("/admin/promotions");
                })
              }
            >
              삭제
            </Button>
          ) : null}
        </div>
      ) : null}

      {canAssign ? (
        <div className="space-y-2">
          <Label>수동 지급 (username 또는 id, 줄바꿈/쉼표)</Label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-border bg-background p-2 text-sm"
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder={"user1\nuser2"}
          />
          <Button
            type="button"
            disabled={pending || !targets.trim()}
            onClick={() =>
              start(async () => {
                const list = targets
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const res = await adminAssignPromotionAction(promotionId, list);
                if (res.error) setMsg(res.error);
                else {
                  setMsg(`지급 ${res.created} · 스킵 ${res.skipped}`);
                  setTargets("");
                  router.refresh();
                }
              })
            }
          >
            지급
          </Button>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
