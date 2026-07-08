"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { getCommunityJoinRequests, reviewCommunityJoinRequest } from "@/actions/community-join";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type RequestRow = {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  message: string | null;
  createdAt: string;
};

export function CommunityJoinRequestsPanel({ communityId }: { communityId: string }) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await getCommunityJoinRequests(communityId);
    setRequests(res.requests ?? []);
    if (res.error) setError(res.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [communityId]);

  async function review(id: string, action: "approve" | "reject") {
    setActing(id);
    setError("");
    const res = await reviewCommunityJoinRequest(id, action);
    if ("error" in res && res.error) setError(res.error);
    else await load();
    setActing(null);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">가입 요청</h2>
          <p className="text-sm text-muted-foreground mt-1">
            승인 대기 중인 멤버를 확인하고 처리합니다.
          </p>
        </div>
        {requests.length > 0 && (
          <span className="text-xs font-medium bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
            {requests.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">대기 중인 가입 요청이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.image ?? undefined} />
                  <AvatarFallback>{r.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.name ?? r.username}</p>
                  <p className="text-xs text-muted-foreground">@{r.username}</p>
                  {r.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.message}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={acting === r.id}
                  onClick={() => void review(r.id, "reject")}
                >
                  {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  거절
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={acting === r.id}
                  onClick={() => void review(r.id, "approve")}
                >
                  {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  승인
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
