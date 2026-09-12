"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  adminForceDeleteEventMapRecommendation,
  getAdminEventMapRecommendations,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { ExternalLink, MapPin, RefreshCw, Trash2 } from "lucide-react";

type Recommendation = Awaited<ReturnType<typeof getAdminEventMapRecommendations>>[number];

function mapHref(lat: number, lng: number) {
  return `/events/map?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&zoom=15`;
}

export function AdminEventsMapPanel({ initialRecommendations }: { initialRecommendations: Recommendation[] }) {
  const [rows, setRows] = useState(initialRecommendations);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const next = await getAdminEventMapRecommendations();
      setRows(next);
    });
  }

  function deleteRecommendation(id: string) {
    startTransition(async () => {
      const result = await adminForceDeleteEventMapRecommendation(id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-500" />
          유저 추천 핀 ({rows.length})
        </h2>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={refresh}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${pending ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
          등록된 유저 추천 핀이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <p className="font-medium truncate">{row.title}</p>
                  </div>
                  {row.description?.trim() ? (
                    <p className="text-sm text-muted-foreground">{row.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    등록:{" "}
                    <Link href={`/u/${row.user.username}`} className="hover:underline">
                      @{row.user.username}
                    </Link>
                    {" · "}
                    {format(new Date(row.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                    {" · "}
                    {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={mapHref(row.lat, row.lng)} target="_blank" className="gap-1">
                      <ExternalLink className="h-3.5 w-3.5" />
                      지도
                    </Link>
                  </Button>
                  <InlineConfirm
                    message={`「${row.title}」 추천 핀을 강제 삭제할까요?`}
                    confirmLabel="강제 삭제"
                    pending={pending}
                    onConfirm={() => deleteRecommendation(row.id)}
                    renderTrigger={(open) => (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={open}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </Button>
                    )}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
