import Link from "next/link";
import { adminLoadAudit } from "@/actions/admin-cms";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const res = await adminLoadAudit({ q: sp.q, action: sp.action, page });
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  const { items, total, totalPages } = res.data;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">감사 로그</h1>
        <p className="text-sm text-muted-foreground">관리자 작업 기록 · 검색 가능 · 총 {total}건</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="액션 · 대상 · 관리자"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="action"
          defaultValue={sp.action}
          placeholder="action exact"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          검색
        </button>
      </form>

      <ul className="space-y-2 rounded-xl border border-border/70 p-3 text-sm">
        {items.map((a) => (
          <li key={a.id} className="border-b border-border/40 py-2 last:border-0">
            <p>
              <span className="font-medium">@{a.actor.username}</span>{" "}
              <span className="text-primary">{a.action}</span>
              {a.targetType ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {a.targetType}/{a.targetId}
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {a.createdAt.toISOString().replace("T", " ").slice(0, 19)}
              {a.ip ? ` · ${a.ip}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 text-sm">
        {page > 1 ? (
          <Link
            href={`/admin/audit?page=${page - 1}&q=${sp.q ?? ""}&action=${sp.action ?? ""}`}
            className="underline"
          >
            이전
          </Link>
        ) : null}
        <span className="text-muted-foreground">
          {page}/{totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={`/admin/audit?page=${page + 1}&q=${sp.q ?? ""}&action=${sp.action ?? ""}`}
            className="underline"
          >
            다음
          </Link>
        ) : null}
      </div>
    </div>
  );
}
