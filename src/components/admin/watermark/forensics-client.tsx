"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminWatermarkDetectionResponse } from "@/lib/watermark/types";
import {
  extractImageFrame,
  extractVideoFrames,
  hashFile,
} from "@/lib/watermark/client/extract-frames";
import { normalizeWatermarkSessionIdInput } from "@/lib/watermark/detector/session-id-input";

type SystemStatus = {
  enabled: boolean;
  secretConfigured: boolean;
  sessionCount: number;
  watermarkVersion: number;
};

function humanizeDetectionError(message: string, contentId: string, creatorUsername: string) {
  if (message === "Creator not found" || message === "Creator username is invalid") {
    return "크리에이터 @아이디를 찾을 수 없습니다. 프로필 URL의 username을 확인하세요.";
  }
  if (message === "No watermark sessions recorded for this creator") {
    return [
      `@${creatorUsername.trim().replace(/^@+/, "") || "해당 크리에이터"}의 유료 사진·영상 시청 세션이 없습니다.`,
      "다른 계정으로 해당 크리에이터의 유료 콘텐츠를 연 뒤, 그 화면을 캡처해 다시 시도하세요.",
    ].join(" ");
  }
  if (message === "Creator username, Media ID, or Session ID is required") {
    return "판매 크리에이터 @아이디를 입력하세요.";
  }
  if (message === "No watermark sessions recorded yet") {
    return [
      "아직 기록된 유료 미디어 시청 세션이 없습니다.",
      "포렌식은 플레이어에 워터마크가 입혀진 유료 사진·영상 캡처만 비교할 수 있습니다.",
      "테스트: 다른 계정으로 유료 사진 또는 영상을 구매·연 뒤, 화면을 캡처하고 Media ID를 입력해 다시 분석하세요.",
      "참고: 작성자 본인 열람, 워터마크 켜기 전 캡처는 세션이 없거나 신호가 없습니다.",
    ].join(" ");
  }
  if (message === "No watermark sessions recorded for this content") {
    return [
      `Media ID(${contentId.trim() || "입력값"})에 대한 시청 세션이 없습니다.`,
      "해당 사진·영상을 구매한 다른 계정으로 연 뒤, 그 화면을 캡처해 다시 시도하세요.",
    ].join(" ");
  }
  if (message === "Session ID not found") {
    return [
      "Session ID를 찾을 수 없습니다.",
      "DevTools에서 __mocomoForensicDebug.canvases()[0].sessionId 처럼 실제 값을 복사해 넣으세요.",
      "placeholder 문장(DevTools canvases()[0].sessionId)을 그대로 붙여넣으면 안 됩니다.",
    ].join(" ");
  }
  if (message === "Detection timed out on server") {
    return [
      "서버 분석 시간이 초과되었습니다.",
      "크리에이터 @아이디를 입력했는지 확인하세요.",
      "특정 사진만 비교하려면 Media ID를 추가로 넣으면 더 빠릅니다.",
    ].join(" ");
  }
  return message;
}

export function WatermarkForensicsClient({ systemStatus }: { systemStatus: SystemStatus }) {
  const [file, setFile] = useState<File | null>(null);
  const [creatorUsername, setCreatorUsername] = useState("");
  const [contentId, setContentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminWatermarkDetectionResponse | null>(null);

  async function onAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const normalizedSessionId = normalizeWatermarkSessionIdInput(sessionId);
      if (sessionId.trim() && !normalizedSessionId) {
        setError(
          "Session ID 형식이 올바르지 않습니다. 고급 필드는 비우거나 DevTools에서 복사한 c… 값만 넣으세요."
        );
        return;
      }
      const creatorHandle = creatorUsername.trim().replace(/^@+/, "");
      if (!creatorHandle && !contentId.trim() && !normalizedSessionId) {
        setError("유출된 콘텐츠를 판매한 크리에이터 @아이디를 입력하세요.");
        return;
      }

      const isVideo = file.type.startsWith("video/");
      setStage(isVideo ? "Decoding video frames…" : "Reading image…");

      const frames = isVideo
        ? await extractVideoFrames(file, 12, (done, total) =>
            setStage(`Decoding video frames… ${done}/${total}`)
          )
        : await extractImageFrame(file);

      setStage("Hashing source…");
      const clientFileHash = await hashFile(file);

      const form = new FormData();
      frames.forEach((blob, i) => form.append("frames", blob, `frame-${i}.png`));
      form.append("sourceKind", isVideo ? "video" : "image");
      form.append("clientFileHash", clientFileHash);
      if (creatorHandle) form.append("creatorUsername", creatorHandle);
      if (contentId.trim()) form.append("contentId", contentId.trim());
      if (normalizedSessionId) form.append("sessionId", normalizedSessionId);

      setStage("Analyzing against creator sessions…");
      const res = await fetch("/api/admin/watermark/detect", {
        method: "POST",
        body: form,
      });
      const started = await res.json();
      if (!res.ok || !started.jobId) {
        setError(humanizeDetectionError(started.error ?? "Analysis failed", contentId, creatorUsername));
        return;
      }

      if (started.status === "COMPLETED" && started.result) {
        setResult(started.result as AdminWatermarkDetectionResponse);
        const r = started.result as AdminWatermarkDetectionResponse;
        if (r.status === "NOT_DETECTED") {
          const noiseLike = r.centralScore > 0.45 && r.centralScore < 0.58;
          setError(
            [
              "워터마크 신호를 찾지 못했습니다.",
              noiseLike
                ? `공간 비트 일치 ${(r.centralScore * 100).toFixed(0)}%는 압축·텍스처 노이즈 수준이며, 워터마크가 아닙니다.`
                : null,
              "유료 미디어가 완전히 로드된 뒤 캡처했는지, 크리에이터 @아이디가 맞는지 확인하세요.",
            ]
              .filter(Boolean)
              .join(" ")
          );
        }
        return;
      }

      if (started.status === "FAILED") {
        setError(humanizeDetectionError(started.error ?? "Analysis failed", contentId, creatorUsername));
        return;
      }

      setStage("Matching against viewing sessions…");
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        const poll = await fetch(`/api/admin/watermark/detect/${started.jobId}`);
        const body = await poll.json();
        if (!poll.ok) {
          setError(body.error ?? "Job lookup failed");
          return;
        }
        if (body.status === "PENDING") {
          setStage("Waiting for analysis worker…");
        } else if (body.status === "RUNNING") {
          setStage("Matching against viewing sessions…");
        }
        if (body.status === "FAILED") {
          setError(humanizeDetectionError(body.error ?? "Analysis failed", contentId, creatorUsername));
          return;
        }
        if (body.status === "COMPLETED" && body.result) {
          setResult(body.result as AdminWatermarkDetectionResponse);
          const r = body.result as AdminWatermarkDetectionResponse;
          if (r.status === "NOT_DETECTED") {
            const noiseLike = r.centralScore > 0.45 && r.centralScore < 0.58;
            setError(
              [
                "워터마크 신호를 찾지 못했습니다.",
                noiseLike
                  ? `공간 비트 일치 ${(r.centralScore * 100).toFixed(0)}%는 압축·텍스처 노이즈 수준이며, 워터마크가 아닙니다.`
                  : null,
                "노트북·폰 스크린샷은 유료 미디어가 완전히 로드된 뒤 캡처하세요.",
                "노트북 화면을 다른 폰으로 찍은 사진은 흔들림·각도·밝기에 따라 실패할 수 있습니다 — 크리에이터 @아이디를 확인하고 선명한 정면 캡처를 사용하세요.",
              ]
                .filter(Boolean)
                .join(" ")
            );
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      setError(
        [
          "Analysis timed out",
          "크리에이터 @아이디가 맞는지 확인하세요.",
          "특정 사진만 대상으로 하려면 Media ID를 추가하세요.",
        ].join(" ")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis request failed");
    } finally {
      setStage(null);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <p className="text-sm font-medium">시스템 상태</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">워터마크</dt>
            <dd className={systemStatus.enabled ? "text-emerald-600" : "text-red-600"}>
              {systemStatus.enabled ? "켜짐" : "꺼짐"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">마스터 시크릿</dt>
            <dd className={systemStatus.secretConfigured ? "text-emerald-600" : "text-red-600"}>
              {systemStatus.secretConfigured ? "설정됨" : "미설정"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">기록된 시청 세션</dt>
            <dd className="font-medium">{systemStatus.sessionCount.toLocaleString()}건</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">프로토콜 버전</dt>
            <dd className="font-medium">v{systemStatus.watermarkVersion}</dd>
          </div>
        </dl>
        {systemStatus.sessionCount === 0 ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            시청 세션이 0건이면 분석을 시작할 수 없습니다. 다른 계정으로 유료 사진·영상을
            열어 세션을 만든 뒤 다시 시도하세요.
          </p>
        ) : (
          <>
          <p className="mt-3 text-xs text-muted-foreground">
            일반 캡처(노트북/폰 스크린샷, 다른 기기로 화면을 찍은 사진)를 그대로 업로드하면 됩니다.
            DevTools <code className="rounded bg-muted px-1">exportPng()</code>는 개발용 진단입니다.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            유료 사진·영상이 화면에 완전히 표시된 뒤 캡처하세요. 판매 크리에이터 @아이디만으로도 분석할 수 있습니다.
          </p>
          </>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Watermark Forensics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          노트북·폰 스크린샷, 또는 다른 기기로 화면을 촬영한 사진·영상을 업로드하세요. 유료 미디어가
          완전히 로드된 뒤 캡처한 샘플과 시청 세션을 비교합니다.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Supported: JPG, PNG, WEBP, MP4, MOV, WEBM. Videos are decoded in this browser and only
            sampled frames are uploaded.
          </p>

          <label className="block text-sm">
            <span className="font-medium">판매 크리에이터 @아이디</span>
            <input
              type="text"
              value={creatorUsername}
              onChange={(e) => setCreatorUsername(e.target.value)}
              placeholder="예: creator_handle"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              유출된 사진·영상을 <strong>판매한 사람</strong>의 프로필 username (@ 없이 또는 @ 포함 모두 가능).
              이 크리에이터 유료 콘텐츠 시청 세션만 검색합니다.
            </span>
          </label>

          <details
            className="rounded-lg border px-3 py-2 dark:border-zinc-700"
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-sm text-muted-foreground">
              고급 (선택) — 특정 사진·DevTools Session ID
            </summary>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Media ID</span>
                <input
                  type="text"
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                  placeholder="특정 PostMedia id (더 빠름)"
                  className="mt-1 block w-full rounded-lg border px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Session ID</span>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="DevTools sessionId (개발용)"
                  className="mt-1 block w-full rounded-lg border px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>
          </details>

          <button
            type="button"
            disabled={!file || loading}
            onClick={() => void onAnalyze()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Analyzing…" : "Start analysis"}
          </button>
          {stage ? <p className="text-sm text-muted-foreground">{stage}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      {result ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Detection result</p>
            <p className="text-2xl font-bold">{result.status.replace(/_/g, " ")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="font-medium">{(result.confidence * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ECC</dt>
              <dd className="font-medium">{result.eccValid ? "PASS" : "FAIL"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Integrity</dt>
              <dd className="font-medium">{result.integrityValid ? "PASS" : "FAIL"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Spatial bit agreement</dt>
              <dd className="font-medium">{(result.centralScore * 100).toFixed(1)}%</dd>
            </div>
          </dl>

          {!result.eccValid && !result.integrityValid && result.centralScore < 0.72 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ~50% spatial agreement is normal on unmarked photos and compression noise — it is not
              watermark detection. ECC and integrity must pass before a session can be identified.
            </p>
          ) : null}

          {result.detectedRegions?.length ? (
            <div>
              <p className="text-sm font-medium mb-2">
                Quadrant regions (A/B/C/D — same user payload, independent embed)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.detectedRegions.map((r) => (
                  <span
                    key={r.key}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-mono",
                      r.recovered
                        ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-border"
                    )}
                  >
                    {r.key} {r.recovered ? "ECC+integrity" : "—"} ({(r.score * 100).toFixed(0)}% bits)
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                MATCH requires at least one quadrant with ECC + cryptographic integrity — not bit
                similarity alone (~50% is unmarked noise).
              </p>
            </div>
          ) : null}

          {result.member ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="font-medium">Associated viewing session</p>
              <ul className="mt-2 space-y-1">
                <li>Member: @{result.member.username}</li>
                {result.content ? (
                  <li>
                    Content: {result.content.title ?? result.content.id} (@{result.content.authorUsername})
                  </li>
                ) : null}
                {result.session ? <li>Session: {result.session.id}</li> : null}
                {result.purchase ? (
                  <li>Purchase: {result.purchase.price.toLocaleString()} KRW</li>
                ) : null}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                This indicates the leaked media contains signals linked to this session — not a
                definitive attribution of who leaked it.
              </p>
            </div>
          ) : null}

          {result.analysisLog ? (
            <p className="text-xs text-muted-foreground">
              Frames analyzed: {result.analysisLog.framesAnalyzed ?? "N/A"} · Candidate frames:{" "}
              {result.analysisLog.candidateFrames ?? "N/A"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
