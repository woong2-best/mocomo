"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/turnstile-client";

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  className?: string;
};

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
          retry?: "auto" | "never";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_TIMEOUT_MS = 20_000;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile?.render) return Promise.resolve();

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const done = () => {
      const wait = () => {
        if (window.turnstile?.render) resolve();
        else requestAnimationFrame(wait);
      };
      wait();
    };

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") return done();
      existing.addEventListener("load", () => {
        existing.dataset.loaded = "1";
        done();
      });
      existing.addEventListener("error", () => reject(new Error("Turnstile script load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      done();
    };
    script.onerror = () => reject(new Error("Turnstile script load failed"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function TurnstileField({ onToken, onExpire, className }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountIdRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const siteKey = getTurnstileSiteKey();

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile?.render) return;

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }

    const run = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        size: "normal",
        retry: "auto",
        callback: (token) => {
          setSlow(false);
          setFailed(false);
          onToken(token);
        },
        "expired-callback": () => {
          onExpire?.();
          onToken("");
        },
        "error-callback": () => {
          setFailed(true);
          onToken("");
        },
      });
    };

    if (typeof window.turnstile.ready === "function") {
      window.turnstile.ready(run);
    } else {
      run();
    }
  }, [siteKey, onToken, onExpire]);

  useEffect(() => {
    if (!siteKey) return;

    const mountId = ++mountIdRef.current;
    setFailed(false);
    setSlow(false);
    onToken("");

    const slowTimer = window.setTimeout(() => setSlow(true), 8_000);
    const failTimer = window.setTimeout(() => {
      if (mountId === mountIdRef.current) setFailed(true);
    }, LOAD_TIMEOUT_MS);

    loadTurnstileScript()
      .then(() => {
        if (mountId !== mountIdRef.current) return;
        renderWidget();
      })
      .catch(() => {
        if (mountId === mountIdRef.current) setFailed(true);
      });

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(failTimer);
      if (mountId === mountIdRef.current && widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget, retryKey, onToken]);

  if (!isTurnstileConfigured() || !siteKey) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        보안 확인은 서버 요청 제한으로 보호됩니다.
      </p>
    );
  }

  if (failed) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-destructive">
          보안 확인을 불러오지 못했습니다. Cloudflare Turnstile에 <strong>mocomo.net</strong> 도메인이
          등록됐는지 확인한 뒤 새로고침해 주세요.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            setFailed(false);
            setRetryKey((k) => k + 1);
          }}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} aria-label="보안 확인" />
      {slow && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          확인이 오래 걸리면 광고 차단을 끄거나 새로고침해 주세요.
        </p>
      )}
    </div>
  );
}
