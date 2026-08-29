"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/turnstile-client";

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onUnavailable?: (unavailable: boolean) => void;
  className?: string;
  /** 회원가입 등 — 위젯이 비어도 바로 우회 링크 표시 */
  showSkipImmediately?: boolean;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const RENDER_RETRY_MS = 150;
const RENDER_MAX_ATTEMPTS = 40;

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

function TurnstileWidget({
  onToken,
  onExpire,
  onUnavailable,
  className,
  showSkipImmediately = false,
}: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [showSkip, setShowSkip] = useState(showSkipImmediately);
  const siteKey = getTurnstileSiteKey();

  // Call sites pass inline arrows, so keeping these in deps would re-run the render
  // effect on every parent render and tear the widget down before Cloudflare can
  // mount its challenge iframe.
  const callbacksRef = useRef({ onToken, onExpire, onUnavailable });
  useEffect(() => {
    callbacksRef.current = { onToken, onExpire, onUnavailable };
  }, [onToken, onExpire, onUnavailable]);

  const enableFallback = useCallback(() => {
    setUseFallback(true);
    setFailed(false);
    callbacksRef.current.onToken("");
    callbacksRef.current.onUnavailable?.(true);
  }, []);

  /** Returns false while api.js has not defined window.turnstile yet, so the caller retries. */
  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    // Never call turnstile.ready(): Cloudflare throws when the script tag carries
    // async/defer, which next/script always adds. render=explicit + Script onReady
    // already guarantees api.js has executed.
    const turnstile = window.turnstile;
    if (!siteKey || !container || !turnstile?.render) return false;

    if (widgetIdRef.current) {
      try {
        turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }

    container.innerHTML = "";

    try {
      widgetIdRef.current = turnstile.render(container, {
        sitekey: siteKey,
        theme: "auto",
        size: "normal",
        callback: (token) => {
          setFailed(false);
          setShowSkip(false);
          callbacksRef.current.onUnavailable?.(false);
          callbacksRef.current.onToken(token);
        },
        "expired-callback": () => {
          callbacksRef.current.onExpire?.();
          callbacksRef.current.onToken("");
        },
        "error-callback": () => setFailed(true),
      });
    } catch {
      setFailed(true);
    }
    return true;
  }, [siteKey]);

  useEffect(() => {
    if (!ready || !siteKey || useFallback) return;

    const mount = ++mountRef.current;
    let cancelled = false;
    const timers: number[] = [];

    setFailed(false);
    setShowSkip(showSkipImmediately);
    callbacksRef.current.onToken("");
    callbacksRef.current.onUnavailable?.(false);

    if (!showSkipImmediately) {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setShowSkip(true);
        }, 4000)
      );
    }

    let attempts = 0;
    const attempt = () => {
      if (cancelled) return;
      if (renderWidget()) return;
      if (++attempts >= RENDER_MAX_ATTEMPTS) {
        setFailed(true);
        return;
      }
      timers.push(window.setTimeout(attempt, RENDER_RETRY_MS));
    };
    attempt();

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
      if (mount === mountRef.current && widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, useFallback, showSkipImmediately, renderWidget]);

  if (!isTurnstileConfigured() || !siteKey) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        보안 확인은 서버 요청 제한으로 보호됩니다.
      </p>
    );
  }

  if (useFallback) {
    return <TurnstileFallbackNotice />;
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

function TurnstileFallbackNotice() {
  return (
    <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-center">
      <strong>요청 제한 모드</strong>로 진행합니다. 아래 버튼을 그대로 눌러 주세요.
    </p>
  );
}

/**
 * Cloudflare's api.js runs third-party code inside our render tree. Without this
 * boundary any throw from it takes down the whole auth page with Next.js's
 * "client-side exception" screen instead of degrading to the rate-limited path.
 */
export class TurnstileField extends Component<TurnstileFieldProps, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[turnstile] widget crashed, falling back to rate-limited mode", error);
    this.props.onToken("");
    this.props.onUnavailable?.(true);
  }

  render(): ReactNode {
    if (this.state.crashed) return <TurnstileFallbackNotice />;
    return <TurnstileWidget {...this.props} />;
  }
}
