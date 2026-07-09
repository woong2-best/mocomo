"use client";

import { useState } from "react";
import {
  adminUnbanUsedMarket,
  getUsedMarketBanStats,
  searchUsedMarketBannedUsers,
  updateUsedAuctionAdminConfig,
} from "@/actions/admin-used-market";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UsedAuctionConfigSlice } from "@/lib/used-auction-config";

type BannedUser = {
  id: string;
  username: string;
  name: string | null;
  usedMarketBannedAt: Date | null;
  auctionPaymentDefaultCount: number;
  auctionWinCount: number;
};

export function AdminUsedMarketPanel({
  initialConfig,
  initialBannedUsers,
}: {
  initialConfig: UsedAuctionConfigSlice | null;
  initialBannedUsers: BannedUser[];
}) {
  const [config, setConfig] = useState(initialConfig);
  const [bannedUsers, setBannedUsers] = useState(initialBannedUsers);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<{
    user: {
      username: string;
      auctionWinCount: number;
      auctionPaymentDefaultCount: number;
      usedMarketBannedAt: Date | null;
    };
    defaultRate: number;
  } | null>(null);
  const [msg, setMsg] = useState("");

  async function saveConfig() {
    if (!config) return;
    setMsg("");
    const res = await updateUsedAuctionAdminConfig(config);
    if ("success" in res) setMsg("설정이 저장되었습니다.");
  }

  async function searchUsers() {
    const res = await searchUsedMarketBannedUsers(search);
    setBannedUsers(res.users ?? []);
  }

  async function loadStats(userId: string) {
    const res = await getUsedMarketBanStats(userId);
    if ("user" in res && res.user) {
      setStats({ user: res.user, defaultRate: res.defaultRate ?? 0 });
    }
  }

  async function unban(userId: string) {
    await adminUnbanUsedMarket(userId);
    setBannedUsers((prev) => prev.filter((u) => u.id !== userId));
    setMsg("차단이 해제되었습니다.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">경매 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span>결제 제한 (시간)</span>
                  <Input
                    type="number"
                    value={config.paymentDeadlineHours}
                    onChange={(e) =>
                      setConfig({ ...config, paymentDeadlineHours: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span>협상 제한 (시간)</span>
                  <Input
                    type="number"
                    value={config.negotiationDeadlineHours}
                    onChange={(e) =>
                      setConfig({ ...config, negotiationDeadlineHours: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <p className="text-sm font-medium">입찰 보증금 (향후 확장)</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.depositEnabled}
                    onChange={(e) =>
                      setConfig({ ...config, depositEnabled: e.target.checked })
                    }
                  />
                  보증금 활성화 (현재 비활성 권장)
                </label>
                <label className="space-y-1 text-sm block">
                  <span>보증금 비율 (0~1)</span>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={config.depositRate}
                    onChange={(e) =>
                      setConfig({ ...config, depositRate: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <Button type="button" onClick={() => void saveConfig()}>
                설정 저장
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">중고거래 차단 사용자</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="username 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={() => void searchUsers()}>
              검색
            </Button>
          </div>
          <ul className="divide-y rounded-xl border text-sm">
            {bannedUsers.length === 0 ? (
              <li className="p-4 text-muted-foreground text-center">차단된 사용자 없음</li>
            ) : (
              bannedUsers.map((u) => (
                <li key={u.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">@{u.username}</p>
                    <p className="text-xs text-muted-foreground">
                      낙찰 {u.auctionWinCount} · 미결제 {u.auctionPaymentDefaultCount}
                      {u.usedMarketBannedAt &&
                        ` · ${new Date(u.usedMarketBannedAt).toLocaleDateString("ko-KR")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void loadStats(u.id)}>
                      기록
                    </Button>
                    <Button type="button" size="sm" onClick={() => void unban(u.id)}>
                      차단 해제
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
          {stats && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">@{stats.user.username} 경매 기록</p>
              <p>총 낙찰: {stats.user.auctionWinCount}</p>
              <p>미결제: {stats.user.auctionPaymentDefaultCount}</p>
              <p>미결제 비율: {stats.defaultRate}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-primary">{msg}</p>}
    </div>
  );
}
