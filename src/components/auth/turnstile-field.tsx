"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/turnstile-client";

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="turnstile/v0/api.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script load failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileField({ onToken, onExpire, className }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const siteKey = getTurnstileSiteKey();

  const renderWidget = useCallback(async () => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token) => onToken(token),
      "expired-callback": () => {
        onExpire?.();
        onToken("");
      },
      "error-callback": () => setFailed(true),
    });
  }, [siteKey, onToken, onExpire]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (!cancelled) void renderWidget();
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [siteKey, renderWidget]);

  if (!isTurnstileConfigured() || !siteKey) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        보안 확인은 서버 요청 제한으로 보호됩니다. (Turnstile 키 설정 시 봇 차단 강화)
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-xs text-destructive text-center">
        보안 위젯을 불러오지 못했습니다. 새로고침해 주세요.
      </p>
    );
  }

  return <div ref={containerRef} className={className} aria-label="보안 확인" />;
}
