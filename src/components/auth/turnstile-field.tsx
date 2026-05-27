"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/turnstile-client";

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  /** 위젯 로드 실패 시 true — 서버가 요청 제한만으로 가입 허용 */
  onUnavailable?: (unavailable: boolean) => void;
  className?: string;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    mocomoTurnstileOk?: (token: string) => void;
    mocomoTurnstileErr?: () => void;
    mocomoTurnstileExp?: () => void;
  }
}

export function TurnstileField({ onToken, onExpire, onUnavailable, className }: TurnstileFieldProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const siteKey = getTurnstileSiteKey();

  useEffect(() => {
    window.mocomoTurnstileOk = (token) => {
      setFailed(false);
      setUseFallback(false);
      onUnavailable?.(false);
      onToken(token);
    };
    window.mocomoTurnstileErr = () => {
      setFailed(true);
      onToken("");
      onUnavailable?.(false);
    };
    window.mocomoTurnstileExp = () => {
      onExpire?.();
      onToken("");
    };
    return () => {
      delete window.mocomoTurnstileOk;
      delete window.mocomoTurnstileErr;
      delete window.mocomoTurnstileExp;
    };
  }, [onToken, onExpire, onUnavailable]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !widgetRef.current || useFallback) return;
    widgetRef.current.innerHTML = "";
    const el = document.createElement("div");
    el.className = "cf-turnstile";
    el.setAttribute("data-sitekey", siteKey);
    el.setAttribute("data-theme", "auto");
    el.setAttribute("data-callback", "mocomoTurnstileOk");
    el.setAttribute("data-error-callback", "mocomoTurnstileErr");
    el.setAttribute("data-expired-callback", "mocomoTurnstileExp");
    widgetRef.current.appendChild(el);
  }, [scriptReady, siteKey, useFallback]);

  function enableFallback() {
    setUseFallback(true);
    setFailed(false);
    onToken("");
    onUnavailable?.(true);
  }

  if (!isTurnstileConfigured() || !siteKey) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        보안 확인은 서버 요청 제한으로 보호됩니다.
      </p>
    );
  }

  if (useFallback) {
    return (
      <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-center">
        보안 위젯을 쓸 수 없어 <strong>요청 제한 모드</strong>로 가입합니다. (Cloudflare에 mocomo.net 등록 후
        새로고침하면 체크박스가 나옵니다)
      </p>
    );
  }

  if (failed) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-destructive leading-relaxed">
          Cloudflare Turnstile 연결에 실패했습니다.
          <br />
          <strong>Turnstile → 위젯 → Settings → Hostname</strong>에{" "}
          <code className="text-[11px]">mocomo.net</code> 을 추가한 뒤 저장하세요.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setFailed(false);
              setScriptReady(false);
              window.location.reload();
            }}
          >
            새로고침
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={enableFallback}>
            제한 모드로 계속
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={widgetRef} className="min-h-[65px] flex justify-center" aria-label="보안 확인" />
    </div>
  );
}
