"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminAddCsMemo,
  adminCsFreezeUser,
  adminCsGrantItem,
  adminCsRefundGold,
  adminCsUnfreezeUser,
  adminCsWarnUser,
  adminExportCsTimeline,
  adminGetCsUserDetail,
  adminSearchEconomyCs,
  type CsUserDetail,
} from "@/actions/admin-cs";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuditLine } from "@/lib/apt/economy/audit/audit-types";
import { AUDIT_CATEGORIES } from "@/lib/apt/economy/audit/audit-types";
import type { CsSearchHit } from "@/lib/apt/economy/admin-cs-service";
import { cn } from "@/lib/utils";
import {
  Download,
  FileText,
  Loader2,
  Pause,
  Play,
  Search,
  Snowflake,
} from "lucide-react";

const FILTER_CATEGORIES = AUDIT_CATEGORIES;

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditLineRow({ line, highlight }: { line: AuditLine; highlight?: boolean }) {
  const isCritical = line.severity === "CRITICAL" || line.severity === "ERROR";
  const isWarn = line.severity === "WARN";
  return (
    <div
      className={cn(
        "relative border-l-2 pl-4 pb-4 ml-2",
        isCritical ? "border-rose-500" : isWarn ? "border-orange-400" : "border-border",
        highlight && "bg-primary/5 -mx-2 px-2 rounded-md"
      )}
    >
      <p className="text-xs text-muted-foreground font-mono">{line.timeShort}</p>
      <p className="text-xs font-semibold text-muted-foreground">{line.category} · {line.action}</p>
      <p className="font-medium text-sm">{line.headline}</p>
      <p className="text-sm text-muted-foreground">{line.reason}</p>
      {line.balanceLine ? (
        <p className="text-sm font-mono text-slate-700">Balance {line.balanceLine}</p>
      ) : null}
      {line.reference ? (
        <p className="text-[11px] font-mono text-muted-foreground truncate">Ref {line.reference}</p>
      ) : null}
      {line.correlationId ? (
        <p className="text-[11px] font-mono text-blue-600 truncate">Corr {line.correlationId}</p>
      ) : null}
      <p className="text-[11px] text-muted-foreground mt-0.5">Actor: {line.actorLabel}</p>
      {line.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1">
          {line.tags.slice(0, 5).map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminCsPanel() {
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<CsSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CsUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [memoText, setMemoText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadUser = useCallback(async (id: string) => {
    setLoading(true);
    setUserId(id);
    const d = await adminGetCsUserDetail(id);
    setDetail(d);
    setLoading(false);
    setReplayIndex(0);
    setReplayPlaying(false);
  }, []);

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const hits = await adminSearchEconomyCs(query.trim());
    setSearchHits(hits);
    setSearching(false);
    if (hits.length === 1) {
      await loadUser(hits[0]!.userId);
    }
  }

  const filteredTimeline = useMemo(() => {
    if (!detail) return [];
    if (!filters.size) return detail.auditLines;
    return detail.auditLines.filter((l) => filters.has(l.category));
  }, [detail, filters]);

  useEffect(() => {
    if (!replayPlaying || !filteredTimeline.length) return;
    replayTimer.current = setInterval(() => {
      setReplayIndex((i) => {
        if (i >= filteredTimeline.length - 1) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 800);
    return () => {
      if (replayTimer.current) clearInterval(replayTimer.current);
    };
  }, [replayPlaying, filteredTimeline.length]);

  function toggleFilter(cat: string) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function onExport(format: "csv" | "json") {
    if (!userId || !detail) return;
    setBusy(`export-${format}`);
    const res = await adminExportCsTimeline(userId, format);
    setBusy(null);
    if ("ok" in res && res.ok) {
      downloadText(
        res.filename,
        res.data,
        format === "json" ? "application/json" : "text/csv"
      );
    }
  }

  async function onAddMemo() {
    if (!userId || !memoText.trim()) return;
    setBusy("memo");
    await adminAddCsMemo(userId, memoText);
    setMemoText("");
    await loadUser(userId);
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <form onSubmit={(e) => void onSearch(e)} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="User ID · corr_xxx · 닉네임 · Wallet Tx · Order ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
        </Button>
      </form>

      {searchHits.length > 1 ? (
        <Card>
          <CardContent className="p-3 space-y-1">
            {searchHits.map((h) => (
              <button
                key={`${h.kind}-${h.id}`}
                type="button"
                className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted text-sm"
                onClick={() => void loadUser(h.userId)}
              >
                <span className="font-medium">{h.label}</span>
                {h.sublabel ? (
                  <span className="text-muted-foreground ml-2">{h.sublabel}</span>
                ) : null}
                <span className="text-xs text-muted-foreground ml-2">({h.kind})</span>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {detail && !loading ? (
        <>
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-4 items-start justify-between">
              <div>
                <p className="text-lg font-bold">@{detail.user.username}</p>
                <p className="text-sm text-muted-foreground">{detail.user.email}</p>
                {detail.user.economyOwnerId !== detail.user.userId ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Economy owner: {detail.user.economyOwnerId.slice(0, 8)}…
                  </p>
                ) : null}
                <p className="text-sm mt-2 font-mono">
                  {detail.user.gold.toLocaleString()}G · {detail.user.gems.toLocaleString()}💎
                </p>
                <p className="text-xs mt-1">
                  Fraud: {detail.user.fraudScore} ({detail.user.fraudStatus})
                  {detail.user.frozenAt ? " · 🧊 Frozen" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplayIndex(0);
                    setReplayPlaying((p) => !p);
                  }}
                >
                  {replayPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                  Replay
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void onExport("csv")}>
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void onExport("json")}>
                  <FileText className="h-3 w-3 mr-1" /> JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
                {FILTER_CATEGORIES.map((cat) => (
              <label
                key={cat}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer",
                  filters.has(cat) ? "bg-primary text-primary-foreground border-primary" : "bg-muted"
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={filters.has(cat)}
                  onChange={() => toggleFilter(cat)}
                />
                {cat}
              </label>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Economy Audit Timeline</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[520px] overflow-y-auto">
                {filteredTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">이벤트 없음</p>
                ) : (
                  filteredTimeline.map((line, idx) => (
                    <AuditLineRow
                      key={line.id + line.time}
                      line={line}
                      highlight={replayPlaying && idx <= replayIndex}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Wallet Ledger</CardTitle>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
                  {detail.walletLedger.slice(-12).map((row, i) => (
                    <div key={i} className="border-b border-border/50 pb-1">
                      <p className="text-muted-foreground">{formatTime(row.at)}</p>
                      <p>
                        {row.goldBefore} → {row.deltaGold >= 0 ? "+" : ""}
                        {row.deltaGold} → {row.goldAfter}
                      </p>
                    </div>
                  ))}
                  {detail.walletLedger.length === 0 ? (
                    <p className="text-muted-foreground">골드 변동 없음</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CS Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CsActionButtons userId={detail.user.userId} onDone={() => void loadUser(detail.user.userId)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CS Memo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="메모 입력…"
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="w-full" disabled={busy === "memo"} onClick={() => void onAddMemo()}>
                    저장
                  </Button>
                  <ul className="space-y-2 max-h-32 overflow-y-auto text-xs">
                    {detail.memos.map((m) => (
                      <li key={m.id} className="border-b pb-1">
                        <p>{m.memo}</p>
                        <p className="text-muted-foreground">
                          {m.adminName} · {formatTime(m.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniHistory title="Storage" events={detail.storageHistory.slice(-8)} />
            <MiniHistory title="Market" events={detail.marketHistory.slice(-8)} />
            <MiniHistory title="Live" events={detail.liveHistory.slice(-8)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function MiniHistory({ title, events }: { title: string; events: { occurredAt: string; reason: string; category: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-xs">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1 pb-3 max-h-36 overflow-y-auto">
        {events.map((e) => (
          <p key={e.occurredAt + e.reason}>
            {formatTime(e.occurredAt)} · {e.category} · {e.reason}
          </p>
        ))}
        {events.length === 0 ? <p className="text-muted-foreground">—</p> : null}
      </CardContent>
    </Card>
  );
}

function CsActionButtons({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
    onDone();
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const reason = prompt("동결 사유");
          if (reason) void act("freeze", () => adminCsFreezeUser(userId, reason));
        }}
      >
        <Snowflake className="h-3 w-3 mr-1" /> Freeze
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const reason = prompt("해제 사유", "검토 완료");
          if (reason) void act("unfreeze", () => adminCsUnfreezeUser(userId, reason));
        }}
      >
        Unfreeze
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const reason = prompt("경고 사유");
          if (reason) void act("warn", () => adminCsWarnUser(userId, reason));
        }}
      >
        Warn
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const amount = Number(prompt("환불 골드 (음수=차감)", "500"));
          const reason = prompt("사유");
          if (reason && Number.isFinite(amount)) {
            void act("refund", () => adminCsRefundGold(userId, amount, reason));
          }
        }}
      >
        Refund Gold
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="col-span-2"
        disabled={busy}
        onClick={() => {
          const itemId = prompt("아이템 ID (stickerTypeId)");
          const qty = Number(prompt("수량", "1"));
          const reason = prompt("사유");
          if (itemId && reason && qty > 0) {
            void act("grant", () => adminCsGrantItem(userId, itemId, qty, reason));
          }
        }}
      >
        Grant Item
      </Button>
    </div>
  );
}
