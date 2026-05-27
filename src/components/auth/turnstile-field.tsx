"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/turnstile-client";

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onUnavailable?: (unavailable: boolean) => void;
  className?: string;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({ onToken, onExpire, onUnavailable, className }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const siteKey = getTurnstileSiteKey();

  const enableFallback = useCallback(() => {
    setUseFallback(true);
    setFailed(false);
    onToken("");
    onUnavailable?.(true);
  }, [onToken, onUnavailable]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile?.render) return false;

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }

    containerRef.current.innerHTML = "";

    const run = () => {
      if (!containerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "normal",
          callback: (token) => {
            setFailed(false);
            setShowSkip(false);
            onUnavailable?.(false);
            onToken(token);
          },
          "expired-callback": () => {
            onExpire?.();
            onToken("");
          },
          "error-callback": () => setFailed(true),
        });
      } catch {
        setFailed(true);
      }
    };

    if (typeof window.turnstile.ready === "function") {
      window.turnstile.ready(run);
    } else {
      run();
    }
    return true;
  }, [siteKey, onToken, onExpire, onUnavailable]);

  useEffect(() => {
    if (!ready || !siteKey || useFallback) return;

    const mount = ++mountRef.current;
    setFailed(false);
    setShowSkip(false);
    onToken("");
    onUnavailable?.(false);

    const skipTimer = window.setTimeout(() => {
      if (mount === mountRef.current) setShowSkip(true);
    }, 6000);

    const failTimer = window.setTimeout(() => {
      if (mount === mountRef.current && !widgetIdRef.current) setFailed(true);
    }, 15000);

    renderWidget();

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(failTimer);
      if (mount === mountRef.current && widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, useFallback, renderWidget, onToken, onUnavailable]);

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
        <strong>요청 제한 모드</strong>로 가입합니다. 아래 「회원가입」 버튼을 눌러 주세요.
      </p>
    );
  }

  if (failed) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-destructive">
          보안 확인 위젯을 불러오지 못했습니다. Site Key가 Vercel과 Cloudflare MoCoMo 위젯이 같은지 확인해 주세요.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => window.location.reload()}>
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
    <div className={`space-y-2 ${className ?? ""}`}>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={containerRef} className="min-h-[70px] flex justify-center items-center" aria-label="보안 확인" />
      {showSkip && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">위젯이 비어 있나요?</p>
          <Button type="button" variant="ghost" size="sm" className="text-xs h-auto p-0 underline" onClick={enableFallback}>
            제한 모드로 계속 가입하기
          </Button>
        </div>
      )}
    </div>
  );
}
