"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatAtmLetterDate } from "@/lib/chat-atm-letter";

type Props = {
  amount: number;
  message: string;
  senderName: string;
  createdAt: string;
};

function Heart() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function EnvelopeFace() {
  return (
    <div className="tl-envelope">
      <div className="tl-env-body" />
      <div className="tl-env-bottom-fold" />
      <div className="tl-env-side-left" />
      <div className="tl-env-side-right" />
      <div className="tl-env-flap" />
      <div className="tl-env-flap-shadow" />
      <div className="tl-heart">
        <Heart />
      </div>
    </div>
  );
}

function LetterPaper({
  amount,
  message,
  senderName,
  createdAt,
}: Props) {
  const dateLabel = formatAtmLetterDate(createdAt);
  return (
    <div className="tl-letter" id="tl-letter-paper">
      <div className="tl-corner tl-tl" />
      <div className="tl-corner tl-tr" />
      <div className="tl-corner tl-bl" />
      <div className="tl-corner tl-br" />
      <div className="tl-letter-header">
        {dateLabel}
        <br />
        {amount.toLocaleString()} MOCO
      </div>
      <div className="tl-letter-body">
        {message ? <p>{message}</p> : <p className="tl-blank"> </p>}
      </div>
      <div className="tl-letter-footer">
        <span className="tl-name">— {senderName}</span>
      </div>
    </div>
  );
}

export function TransferLetterCard(props: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stage = open ? (
    <div className="tl-stage" onClick={() => setOpen(false)} role="presentation">
      <div className="tl-envelope-area tl-envelope-area-open" aria-hidden>
        <EnvelopeFace />
      </div>
      <div className="tl-letter-wrapper tl-up" onClick={(e) => e.stopPropagation()}>
        <LetterPaper {...props} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <style>{LETTER_CSS}</style>
      <button
        type="button"
        className="tl-envelope-area tl-envelope-inline"
        onClick={() => setOpen(true)}
        aria-label="편지 열기"
      >
        <EnvelopeFace />
      </button>
      <p className="tl-hint">봉투를 눌러 편지를 여세요</p>
      {mounted && stage ? createPortal(stage, document.body) : null}
    </>
  );
}

const LETTER_CSS = `
.tl-envelope-area {
  position: relative;
  z-index: 10;
  cursor: pointer;
  border: 0;
  padding: 0;
  background: transparent;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s;
  user-select: none;
  width: min(240px, 72vw);
  aspect-ratio: 240 / 165;
  height: auto;
}
.tl-envelope-inline {
  display: block;
  width: min(220px, 100%);
}
.tl-envelope-area:hover:not(.tl-envelope-area-open) {
  transform: scale(1.05) translateY(-4px);
}
.tl-envelope-area:active {
  transform: scale(0.98);
}
.tl-envelope-area-open {
  position: absolute;
  left: 50%;
  top: 42%;
  z-index: 1;
  pointer-events: none;
  cursor: default;
  transform: translate(-50%, -50%);
  animation: tl-env-away 0.55s ease 0.45s forwards;
}
@keyframes tl-env-away {
  to { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
}
.tl-envelope {
  width: 100%;
  height: 100%;
  position: relative;
  filter: drop-shadow(0 12px 28px rgba(0,0,0,0.2));
}
.tl-env-body {
  position: absolute;
  inset: 0;
  background: linear-gradient(165deg, #ffffff 0%, #f7f7f7 35%, #eeeeee 70%, #e4e4e4 100%);
  border-radius: 3px 3px 5px 5px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  overflow: hidden;
}
.tl-env-body::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.008) 2px, rgba(0,0,0,0.008) 3px);
  pointer-events: none;
}
.tl-env-flap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 56%;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 40%, #f2f2f2 100%);
  clip-path: polygon(0 0, 50% 78%, 100% 0);
  z-index: 2;
}
.tl-env-flap-shadow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 56%;
  clip-path: polygon(0 0, 50% 78%, 100% 0);
  box-shadow: inset 0 -10px 16px -8px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.04);
  z-index: 3;
  pointer-events: none;
}
.tl-env-bottom-fold {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(0deg, rgba(0,0,0,0.04) 0%, transparent 55%);
  clip-path: polygon(0 100%, 50% 12%, 100% 100%);
  z-index: 1;
}
.tl-env-side-left,
.tl-env-side-right {
  position: absolute;
  bottom: 0;
  width: 42%;
  height: 52%;
  z-index: 1;
  pointer-events: none;
}
.tl-env-side-left {
  left: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.03) 100%);
  clip-path: polygon(0 0, 100% 55%, 0 100%);
}
.tl-env-side-right {
  right: 0;
  background: linear-gradient(225deg, transparent 40%, rgba(0,0,0,0.03) 100%);
  clip-path: polygon(100% 0, 0 55%, 100% 100%);
}
.tl-heart {
  position: absolute;
  top: 54%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 13%;
  height: auto;
  aspect-ratio: 1;
  z-index: 4;
}
.tl-envelope-area:hover .tl-heart {
  transform: translate(-50%, -50%) scale(1.12);
}
.tl-heart svg {
  width: 100%;
  height: 100%;
  fill: #e85a71;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15));
}
.tl-hint {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-foreground, #8a8178);
  text-align: center;
}
.tl-stage {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 12, 0.28);
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
}
.tl-letter-wrapper {
  position: relative;
  width: min(420px, 92vw);
  max-height: min(78dvh, 680px);
  z-index: 5;
  animation: tl-rise 1.15s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
.tl-letter {
  background: #fdf8f0;
  border-radius: 4px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(139, 90, 43, 0.15), inset 0 0 80px rgba(232, 213, 183, 0.3);
  padding: clamp(28px, 5vw, 48px) clamp(22px, 4vw, 40px) clamp(32px, 6vw, 56px);
  min-height: min(520px, 68dvh);
  max-height: min(78dvh, 680px);
  overflow: auto;
  position: relative;
  background-image: repeating-linear-gradient(transparent, transparent 27px, rgba(180, 160, 130, 0.25) 27px, rgba(180, 160, 130, 0.25) 28px);
  background-position: 0 52px;
  font-family: Georgia, "Times New Roman", serif;
}
.tl-letter::before {
  content: '';
  position: absolute;
  left: clamp(36px, 8vw, 52px);
  top: 28px;
  bottom: 28px;
  width: 1.5px;
  background: rgba(200, 80, 80, 0.35);
}
.tl-letter-header {
  text-align: right;
  margin-bottom: clamp(18px, 4vw, 36px);
  padding-right: 8px;
  color: #5c4a3a;
  font-size: clamp(13px, 2.4vw, 14px);
  line-height: 1.6;
}
.tl-letter-body {
  padding-left: clamp(18px, 4vw, 28px);
  color: #3d2f24;
  font-size: clamp(15px, 2.8vw, 16px);
  line-height: 1.75;
  letter-spacing: 0.3px;
  white-space: pre-wrap;
  word-break: break-word;
}
.tl-letter-body p {
  margin: 0 0 18px;
}
.tl-blank {
  min-height: 4.5em;
}
.tl-letter-footer {
  margin-top: clamp(20px, 4vw, 40px);
  text-align: right;
  padding-right: 8px;
  color: #5c4a3a;
  font-size: 15px;
  line-height: 1.7;
}
.tl-name {
  font-size: clamp(16px, 3vw, 18px);
  font-style: italic;
}
.tl-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: rgba(139, 90, 43, 0.35);
  border-style: solid;
  pointer-events: none;
}
.tl-tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
.tl-tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
.tl-bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
.tl-br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }
@keyframes tl-rise {
  from { transform: translateY(70vh); opacity: 0.4; }
  to { transform: translateY(0); opacity: 1; }
}
@media (max-width: 480px) {
  .tl-letter {
    min-height: min(440px, 64dvh);
    padding: 28px 20px 32px;
  }
  .tl-letter::before { left: 32px; }
  .tl-letter-body { padding-left: 16px; }
}
@media (max-height: 700px) {
  .tl-letter { min-height: 0; padding: 22px 18px 26px; }
  .tl-letter-header { margin-bottom: 14px; }
}
`;
