"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { PAID_VIDEO_PROTECTION_WARNING_MS } from "@/lib/paid-content-protection-slide";

type Props = {
  className?: string;
  /** Overlay on video: auto-dismiss after 6s. Slide: static first photo in carousel. */
  variant?: "overlay" | "slide";
  onDismiss?: () => void;
  autoDismissMs?: number;
};

export function PaidVideoCopyrightWarning({
  className,
  variant = "overlay",
  onDismiss,
  autoDismissMs = PAID_VIDEO_PROTECTION_WARNING_MS,
}: Props) {
  const scopeId = useId().replace(/:/g, "");
  const scopeClass = `paid-content-protection-${scopeId}`;
  const [reducedMotion, setReducedMotion] = useState(false);
  const isSlide = variant === "slide";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (isSlide || !onDismiss) return;
    const ms = reducedMotion ? Math.min(autoDismissMs, 1200) : autoDismissMs;
    const t = window.setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [autoDismissMs, isSlide, onDismiss, reducedMotion]);

  return (
    <div
      role={isSlide ? "img" : "presentation"}
      aria-label={isSlide ? t("media.sxfsjf4") : undefined}
      className={cn(
        scopeClass,
        isSlide
          ? "relative flex h-full w-full items-center justify-center overflow-y-auto"
          : "absolute inset-0 z-[10] flex items-center justify-center overflow-y-auto",
        className
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <style jsx>{`
        .${scopeClass} {
          background: #0b1a4a;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvProtectionBgIn 0.4s ease forwards"};
          font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        }
        .${scopeClass} .panel {
          width: 88%;
          max-width: 640px;
          color: #fff;
          text-align: center;
          pointer-events: none;
          padding: 24px 0;
        }
        .${scopeClass} .badge {
          width: 96px;
          height: 96px;
          margin: 0 auto 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: ${reducedMotion ? 1 : 0};
          transform: ${reducedMotion ? "scale(1)" : "scale(0.6)"};
          animation: ${reducedMotion ? "none" : "pvProtectionPop 0.5s ease 0.15s forwards"};
        }
        .${scopeClass} .badge svg {
          width: 96px;
          height: 96px;
        }
        .${scopeClass} .title {
          font-size: clamp(18px, 4.5vw, 30px);
          font-weight: 800;
          letter-spacing: 2px;
          color: #ffd23f;
          margin-bottom: 6px;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvProtectionFadeIn 0.5s ease 0.5s forwards"};
        }
        .${scopeClass} .divider {
          width: ${reducedMotion ? "100%" : "0%"};
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
          margin: 0 auto 22px;
          animation: ${reducedMotion ? "none" : "pvProtectionGrowLine 0.6s ease 0.9s forwards"};
        }
        .${scopeClass} .lead {
          font-size: clamp(12px, 3.2vw, 14px);
          line-height: 1.75;
          color: #fff;
          font-weight: 500;
          margin-bottom: 18px;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.6s ease 1.15s forwards"};
        }
        .${scopeClass} .lead b {
          color: #ffd23f;
        }
        .${scopeClass} .rules {
          text-align: left;
          list-style: none;
          font-size: clamp(11px, 2.8vw, 12.5px);
          line-height: 1.85;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 20px;
        }
        .${scopeClass} .rules li b {
          color: #ffd23f;
          font-weight: 700;
        }
        .${scopeClass} .rules li {
          padding-left: 16px;
          position: relative;
          opacity: ${reducedMotion ? 1 : 0};
        }
        .${scopeClass} .rules li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.4);
        }
        .${scopeClass} .rules li:nth-child(1) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 1.5s forwards"};
        }
        .${scopeClass} .rules li:nth-child(2) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 1.65s forwards"};
        }
        .${scopeClass} .rules li:nth-child(3) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 1.8s forwards"};
        }
        .${scopeClass} .rules li:nth-child(4) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 1.95s forwards"};
        }
        .${scopeClass} .rules li:nth-child(5) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 2.1s forwards"};
        }
        .${scopeClass} .rules li:nth-child(6) {
          animation: ${reducedMotion ? "none" : "pvProtectionFadeUp 0.5s ease 2.25s forwards"};
        }
        .${scopeClass} .footer {
          font-size: clamp(9px, 2.2vw, 11px);
          letter-spacing: 1px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.35);
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvProtectionFadeIn 0.6s ease 2.45s forwards"};
        }
        @keyframes pvProtectionBgIn {
          to {
            opacity: 1;
          }
        }
        @keyframes pvProtectionPop {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pvProtectionFadeIn {
          to {
            opacity: 1;
          }
        }
        @keyframes pvProtectionGrowLine {
          to {
            width: 100%;
          }
        }
        @keyframes pvProtectionFadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="panel">
        <div className="badge">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 2.4 L22.3 20.6 L1.7 20.6 Z"
              fill="#e02020"
              stroke="#e02020"
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <rect x="10.85" y="8.3" width="2.3" height="7.2" rx="1.15" fill="#fff" />
            <circle cx="12" cy="17.6" r="1.3" fill="#fff" />
          </svg>
        </div>
        <div className="title">CONTENT PROTECTION WARNING</div>

        <div className="divider" />

        <div className="lead">
          본 콘텐츠에는 이용자 식별 및 권리 보호를 위한{" "}
          <b>{t("media.s186xet4")}</b>{t("media.sm7jkj9")}
          <br />
          무단 유출·녹화·재배포·공개 등이 확인될 경우{" "}
          <b>{t("media.sjwgrd4")}</b>{t("media.setqwrt")}
          <br />
          <br />
          {t("media.sojrag2")}
          <br />
          {t("media.s1oc5bis")} <b>{t("media.s1iu04av")}</b>{t("media.si1vuvq")}
        </div>

        <ul className="rules">
          <li>{t("media.s1snim0j")}</li>
          <li>{t("media.szcvjf2")}</li>
          <li>
            <b>{t("media.s9iyz48")}</b> {t("media.s1ljd6d8")}
          </li>
          <li>
            <b>{t("media.ss35nc0")}</b> {t("media.s3qsf9g")}
          </li>
          <li>
            <b>{t("media.sq27bh6")}</b> {t("media.s15h4tc8")}
          </li>
          <li>
            {t("media.s1oc5bis")} <b>{t("media.s1ni23ck")}</b>{t("media.sdbh23r")}
          </li>
        </ul>

        <div className="footer">
          UNAUTHORIZED REPRODUCTION, RECORDING, REDISTRIBUTION OR DISCLOSURE
          MAY RESULT IN ACCOUNT SUSPENSION AND LEGAL ACTION.
          <br />
          CONTENT ACCESS IS FOR PERSONAL VIEWING ONLY.
          <br />
          PROTECTION &amp; FORENSIC DATA MAY BE RETAINED FOR RIGHTS ENFORCEMENT.
        </div>
      </div>
    </div>
  );
}

/** @deprecated use PaidVideoCopyrightWarning */
export const PaidContentProtectionWarning = PaidVideoCopyrightWarning;
