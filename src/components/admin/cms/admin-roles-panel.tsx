"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminDemoteStaffAction,
  adminPromoteStaffAction,
  adminResetStaffPasswordAction,
  adminSetStaffRoleAction,
  adminToggleStaffAction,
} from "@/actions/admin-cms";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";

const ASSIGNABLE: UserRole[] = [
  "MARKETING",
  "CUSTOMER_SUPPORT",
  "MODERATOR",
  "SETTLEMENT_MANAGER",
  "SENIOR_MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
];

type StaffRow = {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  role: string;
  adminDisabledAt: Date | string | null;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
};

export function AdminRolesPanel({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("MODERATOR");
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 p-4 space-y-3">
        <h2 className="text-sm font-semibold">관리자 생성 (기존 회원 승격)</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username 또는 user id"
            className="max-w-xs"
          />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {ADMIN_ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={pending || !username.trim()}
            onClick={() =>
              start(async () => {
                const res = await adminPromoteStaffAction(username.trim(), role);
                setMsg(res.error ?? "관리자가 추가되었습니다.");
                if (!res.error) {
                  setUsername("");
                  router.refresh();
                }
              })
            }
          >
            추가
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">계정</th>
              <th className="px-3 py-2">권한</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="px-3 py-2">
                  <p className="font-medium">@{s.username}</p>
                  <p className="text-[11px] text-muted-foreground">{s.email}</p>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    defaultValue={s.role}
                    disabled={pending || s.role === "OWNER"}
                    onChange={(e) =>
                      start(async () => {
                        const res = await adminSetStaffRoleAction(
                          s.id,
                          e.target.value as UserRole
                        );
                        setMsg(res.error ?? "권한이 변경되었습니다.");
                        router.refresh();
                      })
                    }
                  >
                    {ASSIGNABLE.map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLE_LABELS[r] ?? r}
                      </option>
                    ))}
                    {s.role === "OWNER" ? <option value="OWNER">소유자</option> : null}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  {s.adminDisabledAt ? "비활성" : "활성"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await adminToggleStaffAction(s.id, !s.adminDisabledAt);
                          setMsg(res.error ?? (s.adminDisabledAt ? "활성화됨" : "비활성화됨"));
                          router.refresh();
                        })
                      }
                    >
                      {s.adminDisabledAt ? "활성화" : "비활성화"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await adminResetStaffPasswordAction(s.id);
                          if ("temporaryPassword" in res && res.temporaryPassword) {
                            setMsg(`임시 비밀번호: ${res.temporaryPassword}`);
                          } else setMsg(res.error ?? "실패");
                        })
                      }
                    >
                      비밀번호 초기화
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={pending || s.role === "OWNER"}
                      onClick={() =>
                        start(async () => {
                          const res = await adminDemoteStaffAction(s.id);
                          setMsg(res.error ?? "관리자 권한이 제거되었습니다.");
                          router.refresh();
                        })
                      }
                    >
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg}</p> : null}
    </div>
  );
}
