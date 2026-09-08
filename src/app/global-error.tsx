"use client";

import { useEffect, useState } from "react";
import { isStaleDeploymentError, reloadForStaleDeployment } from "@/lib/stale-deployment-error";

/** Root layout client crash — Next.js default white screen 대신 복구 시도 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);
  const stale = isStaleDeploymentError(error);

  useEffect(() => {
    console.error("[global-error]", error);
    if (!stale) return;
    setRecovering(true);
    reloadForStaleDeployment();
  }, [error, stale]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F5F0E8",
          color: "#1a1a1a",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
            {recovering ? "업데이트 반영 중…" : "페이지를 불러오지 못했습니다"}
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.5 }}>
            {recovering
              ? "새 버전을 불러오는 중입니다."
              : stale
                ? "배포 직후 브라우저 캐시가 꼬였을 수 있습니다. 아래 버튼으로 새로고침해 주세요."
                : "일시적인 오류일 수 있습니다."}
          </p>
          {!recovering && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  if (stale) reloadForStaleDeployment();
                  else reset();
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#1B3A8C",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {stale ? "새로고침" : "다시 시도"}
              </button>
              <a
                href="/feed"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#fff",
                  color: "#1a1a1a",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                홈으로
              </a>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
