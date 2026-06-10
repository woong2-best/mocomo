"use client";

import { useEffect, useState } from "react";
import { listCloudStudioProjects, loadCloudStudioProject } from "@/actions/webtoon-studio-cloud";
import { createDefaultProject } from "@/lib/webtoon-studio/constants";
import type { StudioProject } from "@/lib/webtoon-studio/types";
import { listStudioProjects } from "@/lib/webtoon-studio/project-storage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudioHome({
  onOpen,
}: {
  onOpen: (project: StudioProject) => void;
}) {
  const [local, setLocal] = useState<StudioProject[]>([]);
  const [cloud, setCloud] = useState<
    { id: string; name: string; favorite: boolean; updatedAt: Date }[]
  >([]);

  useEffect(() => {
    void listStudioProjects().then(setLocal);
    void listCloudStudioProjects().then(setCloud).catch(() => setCloud([]));
  }, []);

  async function openCloud(id: string) {
    const res = await loadCloudStudioProject(id);
    if ("project" in res && res.project) onOpen(res.project);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">웹툰 드로잉 스튜디오</h2>
        <p className="text-sm text-muted-foreground">프로젝트를 선택하거나 새로 시작하세요.</p>
        <Button type="button" className="rounded-xl" onClick={() => onOpen(createDefaultProject())}>
          + 새 프로젝트
        </Button>
      </div>

      {cloud.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-2">클라우드 프로젝트</h3>
          <ul className="space-y-2">
            {cloud.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void openCloud(p.id)}
                  className="w-full text-left rounded-xl border border-border/60 px-4 py-3 hover:border-emerald-500/40"
                >
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.favorite && <span className="ml-2 text-xs text-amber-600">★</span>}
                  <span className="block text-[10px] text-muted-foreground mt-1">
                    {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {local.length > 0 && (
        <section>
          <h3 className="text-sm font-bold mb-2">로컬 자동 저장</h3>
          <ul className="space-y-2">
            {local.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen({ ...p, dialogues: p.dialogues ?? [] })}
                  className={cn(
                    "w-full text-left rounded-xl border border-border/60 px-4 py-3 hover:border-emerald-500/40"
                  )}
                >
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground mt-1">
                    {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
