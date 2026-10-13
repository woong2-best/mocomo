"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/components/fortune-cookie/fortune-cookie-visual.module.css";

export type FortuneCookieVisualProps = {
  nickname: string;
  serial: string;
  fortuneText: string;
  mode: "closed" | "auto-open" | "opened";
  className?: string;
  onOpened?: () => void;
};

function playCrackSound() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.28;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 900;
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start();
    src.onended = () => void ctx.close();
  } catch {
    /* ignore autoplay / audio errors */
  }
}

function spawnCrumbs(group: SVGGElement | null, reducedMotion: boolean) {
  if (!group || reducedMotion) return;
  const NS = "http://www.w3.org/2000/svg";
  const colors = ["#ecc47c", "#d9a152", "#f8e2ac", "#c08a3e"];
  for (let i = 0; i < 16; i += 1) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", String(150 + (Math.random() * 10 - 5)));
    c.setAttribute("cy", String(200 + Math.random() * 50));
    c.setAttribute("r", String(1.5 + Math.random() * 3.5));
    c.setAttribute("fill", colors[i % 4]!);
    group.appendChild(c);
    const dx = (Math.random() - 0.5) * 120;
    const dy = -20 - Math.random() * 40;
    c.animate(
      [
        { transform: "translate(0,0)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px,${dy}px)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px,${dy + 130}px)`, opacity: 0 },
      ],
      { duration: 800 + Math.random() * 500, easing: "ease-out", fill: "forwards" }
    ).onfinish = () => c.remove();
  }
}

export function FortuneCookieVisual({
  nickname,
  serial,
  fortuneText,
  mode,
  className,
  onOpened,
}: FortuneCookieVisualProps) {
  const rawId = useId().replace(/:/g, "");
  const crumbsRef = useRef<SVGGElement | null>(null);
  const openedOnce = useRef(false);
  const [phase, setPhase] = useState<"closed" | "cracking" | "open">(
    mode === "opened" ? "open" : "closed"
  );

  useEffect(() => {
    if (mode === "opened") {
      setPhase("open");
      return;
    }
    if (mode !== "auto-open") return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const appear = window.setTimeout(() => {
      setPhase("cracking");
      if (!reduced) playCrackSound();
    }, reduced ? 0 : 1000);
    const open = window.setTimeout(() => {
      setPhase("open");
      spawnCrumbs(crumbsRef.current, reduced);
      if (!openedOnce.current) {
        openedOnce.current = true;
        onOpened?.();
      }
    }, reduced ? 80 : 1380);
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(open);
    };
  }, [mode, onOpened]);

  const open = phase === "open";
  const shake = phase === "cracking";

  return (
    <div
      className={`${styles.stage} ${open ? styles.open : ""} ${shake ? styles.shake : ""} ${className ?? ""}`}
      aria-label="Fortune cookie"
    >
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <radialGradient id={`${rawId}-g`} cx="35%" cy="38%" r="80%">
            <stop offset="0" stopColor="#f6d896" />
            <stop offset=".5" stopColor="#e9bb70" />
            <stop offset=".9" stopColor="#d09646" />
            <stop offset="1" stopColor="#bd8038" />
          </radialGradient>
          <linearGradient id={`${rawId}-vs`} x1="0" y1="0" x2="0" y2="1">
            <stop offset=".55" stopColor="#7a4a14" stopOpacity="0" />
            <stop offset="1" stopColor="#7a4a14" stopOpacity=".3" />
          </linearGradient>
          <filter id={`${rawId}-blur`}>
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={`${rawId}-soft`}>
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id={`${rawId}-tex`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".03 .05" numOctaves="3" seed="11" />
            <feColorMatrix values="0 0 0 0 .6  0 0 0 0 .38  0 0 0 0 .12  1.3 0 0 0 -.5" />
          </filter>
          <filter id={`${rawId}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" />
            <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .3  0 0 0 0 .1  0 0 0 .7 -.22" />
          </filter>
          <clipPath id={`${rawId}-body`}>
            <path d="M82 60C55 85 40 125 44 160C50 215 95 256 150 258C205 260 252 215 258 160C261 125 250 95 234 75C224 70 215 74 205 90C190 115 165 160 154 203C140 160 115 105 98 72C92 62 88 58 82 60Z" />
          </clipPath>
          <clipPath id={`${rawId}-cl`}>
            <polygon points="0,0 154,0 154,195 148,213 159,226 148,241 155,257 150,300 0,300" />
          </clipPath>
          <clipPath id={`${rawId}-cr`}>
            <polygon points="300,0 154,0 154,195 148,213 159,226 148,241 155,257 150,300 300,300" />
          </clipPath>
          <g id={`${rawId}-cookie`}>
            <path
              d="M82 60C55 85 40 125 44 160C50 215 95 256 150 258C205 260 252 215 258 160C261 125 250 95 234 75C224 70 215 74 205 90C190 115 165 160 154 203C140 160 115 105 98 72C92 62 88 58 82 60Z"
              fill={`url(#${rawId}-g)`}
            />
            <rect width="300" height="300" filter={`url(#${rawId}-tex)`} opacity=".5" />
            <rect width="300" height="300" filter={`url(#${rawId}-grain)`} opacity=".45" />
            <rect width="300" height="300" fill={`url(#${rawId}-vs)`} />
            <path
              d="M154 203C165 160 190 115 205 90C214 76 224 70 234 75C222 82 210 98 198 120C182 150 166 180 154 203Z"
              fill="#b87a2c"
              opacity=".45"
              filter={`url(#${rawId}-soft)`}
            />
            <path
              d="M154 203C165 160 190 115 205 90C214 76 224 70 234 75"
              fill="none"
              stroke="#fbe7b4"
              strokeOpacity=".7"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M98 72C115 105 140 160 154 203"
              fill="none"
              stroke="#a8691f"
              strokeOpacity=".5"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M96 74C112 104 134 150 152 198"
              fill="none"
              stroke="#fff3cf"
              strokeOpacity=".5"
              strokeWidth="3"
              strokeLinecap="round"
              filter={`url(#${rawId}-soft)`}
            />
            <path
              d="M70 120C62 150 66 190 90 222"
              fill="none"
              stroke="#fff6d8"
              strokeOpacity=".28"
              strokeWidth="12"
              strokeLinecap="round"
              filter={`url(#${rawId}-soft)`}
            />
            <path
              d="M60 175C75 225 120 250 160 252C205 252 244 222 254 175"
              fill="none"
              stroke="#8a5516"
              strokeOpacity=".3"
              strokeWidth="5"
              strokeLinecap="round"
              filter={`url(#${rawId}-soft)`}
            />
            <path
              d="M82 60C55 85 40 125 44 160C50 215 95 256 150 258C205 260 252 215 258 160C261 125 250 95 234 75C224 70 215 74 205 90C190 115 165 160 154 203C140 160 115 105 98 72C92 62 88 58 82 60Z"
              fill="none"
              stroke="#a9701f"
              strokeOpacity=".45"
              strokeWidth="1.6"
            />
          </g>
          <polyline id={`${rawId}-edge`} points="154,0 154,195 148,213 159,226 148,241 155,257 150,300" fill="none" />
        </defs>
        <ellipse
          cx="150"
          cy="258"
          rx="105"
          ry="12"
          fill="#3a2a18"
          opacity=".2"
          filter={`url(#${rawId}-blur)`}
        />
        <g className={`${styles.half} ${styles.hl}`}>
          <g clipPath={`url(#${rawId}-body)`}>
            <g clipPath={`url(#${rawId}-cl)`}>
              <use href={`#${rawId}-cookie`} />
              <use className={styles.brk} href={`#${rawId}-edge`} stroke="#fbeec8" strokeWidth="8" strokeLinejoin="round" />
              <use
                className={styles.brk}
                href={`#${rawId}-edge`}
                stroke="#c99a52"
                strokeWidth="2"
                strokeLinejoin="round"
                transform="translate(-4 0)"
              />
            </g>
          </g>
        </g>
        <g className={`${styles.half} ${styles.hr}`}>
          <g clipPath={`url(#${rawId}-body)`}>
            <g clipPath={`url(#${rawId}-cr)`}>
              <use href={`#${rawId}-cookie`} />
              <use className={styles.brk} href={`#${rawId}-edge`} stroke="#fbeec8" strokeWidth="8" strokeLinejoin="round" />
              <use
                className={styles.brk}
                href={`#${rawId}-edge`}
                stroke="#c99a52"
                strokeWidth="2"
                strokeLinejoin="round"
                transform="translate(4 0)"
              />
            </g>
          </g>
        </g>
        <g ref={crumbsRef} />
      </svg>
      <div className={styles.paper} aria-live="polite">
        <span className={styles.nickname}>{nickname}</span>
        <span className={styles.serial}>{serial}</span>
        <span className={styles.fortune}>{fortuneText}</span>
      </div>
    </div>
  );
}
