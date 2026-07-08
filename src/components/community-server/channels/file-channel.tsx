"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { getCommunityFiles } from "@/actions/community-content";

export function FileChannelView({ communityId }: { communityId: string }) {
  const [files, setFiles] = useState<
    { id: string; url: string; name: string | null; type: string; username: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    void getCommunityFiles(communityId).then((r) => setFiles(r.files));
  }, [communityId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          파일
        </h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {files.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            업로드된 파일이 없습니다. 채팅 채널에서 파일을 공유해 보세요.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.name ?? f.type}</p>
                  <p className="text-xs text-muted-foreground">
                    @{f.username} · {new Date(f.createdAt).toLocaleString()}
                  </p>
                </div>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-2 rounded-md hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
