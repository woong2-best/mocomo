"use client";

import { useState } from "react";
import type { AdminWatermarkDetectionResponse } from "@/lib/watermark/types";

export function WatermarkForensicsClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminWatermarkDetectionResponse | null>(null);

  async function onAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/watermark/detect", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        return;
      }
      setResult(data as AdminWatermarkDetectionResponse);
    } catch {
      setError("Analysis request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Watermark Forensics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a leaked screenshot or video sample. Results indicate whether forensic watermark
          signals match a viewing session — not legal proof of who leaked content.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="text-xs text-muted-foreground">Supported: JPG, PNG, WEBP, MP4, MOV, WEBM (max 80MB)</p>
          <button
            type="button"
            disabled={!file || loading}
            onClick={() => void onAnalyze()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Analyzing…" : "Start analysis"}
          </button>
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
              <dt className="text-muted-foreground">Central score</dt>
              <dd className="font-medium">{(result.centralScore * 100).toFixed(1)}%</dd>
            </div>
          </dl>

          {result.detectedRegions?.length ? (
            <div>
              <p className="text-sm font-medium mb-2">Detected regions</p>
              <div className="flex flex-wrap gap-2">
                {result.detectedRegions.map((r) => (
                  <span
                    key={r.key}
                    className="rounded-md border px-2 py-1 text-xs font-mono"
                  >
                    {r.key} {r.recovered ? "✓" : "△"} ({(r.score * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
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
