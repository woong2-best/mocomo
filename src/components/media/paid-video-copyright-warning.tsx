"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onContinue: () => void;
};

export function PaidVideoCopyrightWarning({ className, onContinue }: Props) {
  const scopeId = useId().replace(/:/g, "");
  const scopeClass = `paid-video-copyright-${scopeId}`;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const reduced = mq.matches;
      setReducedMotion(reduced);
      if (reduced) setCanContinue(true);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setTimeout(() => setCanContinue(true), 2400);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  const onDismiss = () => {
    if (!canContinue) return;
    onContinue();
  };

  return (
    <button
      type="button"
      aria-label="저작권 안내 확인 후 계속 시청"
      disabled={!canContinue}
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        scopeClass,
        "absolute inset-0 z-[10] flex cursor-pointer items-center justify-center border-0 p-0 text-left",
        !canContinue && "cursor-wait",
        className
      )}
    >
      <style jsx>{`
        .${scopeClass} {
          background: #0b1a4a;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvCopyrightBgIn 0.4s ease forwards"};
          font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        }
        .${scopeClass} .panel {
          width: 88%;
          max-width: 640px;
          color: #fff;
          text-align: center;
          pointer-events: none;
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
          animation: ${reducedMotion ? "none" : "pvCopyrightPop 0.5s ease 0.15s forwards"};
        }
        .${scopeClass} .badge svg {
          width: 96px;
          height: 96px;
        }
        .${scopeClass} .title {
          font-size: clamp(22px, 5vw, 30px);
          font-weight: 800;
          letter-spacing: 3px;
          color: #ffd23f;
          margin-bottom: 6px;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeIn 0.5s ease 0.5s forwards"};
        }
        .${scopeClass} .subtitle {
          font-size: 12.5px;
          letter-spacing: 2px;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 26px;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeIn 0.5s ease 0.7s forwards"};
        }
        .${scopeClass} .divider {
          width: ${reducedMotion ? "100%" : "0%"};
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
          margin: 0 auto 26px;
          animation: ${reducedMotion ? "none" : "pvCopyrightGrowLine 0.6s ease 0.9s forwards"};
        }
        .${scopeClass} .lead {
          font-size: clamp(13px, 3.4vw, 15px);
          line-height: 1.8;
          color: #fff;
          font-weight: 500;
          margin-bottom: 22px;
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeUp 0.6s ease 1.15s forwards"};
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
          margin-bottom: 24px;
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
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeUp 0.5s ease 1.5s forwards"};
        }
        .${scopeClass} .rules li:nth-child(2) {
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeUp 0.5s ease 1.68s forwards"};
        }
        .${scopeClass} .rules li:nth-child(3) {
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeUp 0.5s ease 1.86s forwards"};
        }
        .${scopeClass} .footer {
          font-size: 11px;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.35);
          opacity: ${reducedMotion ? 1 : 0};
          animation: ${reducedMotion ? "none" : "pvCopyrightFadeIn 0.6s ease 2.15s forwards"};
        }
        .${scopeClass} .continue {
          margin-top: 20px;
          opacity: ${canContinue ? 1 : 0};
          transform: translateY(${canContinue ? "0" : "8px"});
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .${scopeClass} .continue span {
          display: inline-block;
          padding: 10px 28px;
          border-radius: 999px;
          border: 1px solid rgba(255, 210, 63, 0.55);
          background: rgba(255, 210, 63, 0.12);
          color: #ffd23f;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }
        @keyframes pvCopyrightBgIn {
          to {
            opacity: 1;
          }
        }
        @keyframes pvCopyrightPop {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pvCopyrightFadeIn {
          to {
            opacity: 1;
          }
        }
        @keyframes pvCopyrightGrowLine {
          to {
            width: 100%;
          }
        }
        @keyframes pvCopyrightFadeUp {
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
        <div className="title">COPYRIGHT WARNING</div>
        <div className="subtitle">MoCoMo LLC · PROTECTED CONTENT</div>

        <div className="divider" />

        <div className="lead">
          본 영상에는 시청자 계정과{" "}
          <b>암호학적으로 연결된 포렌식 워터마킹 파이프라인</b>이 적용되어 있습니다.
          <br />
          캡처, 녹화, 편집본 그 어떤 형태로 유출되어도{" "}
          <b>식별 신호는 삭제되지 않고 계정까지 역추적됩니다.</b>
          <br />
          국가와 지역을 옮기거나 익명 계정을 사용해도 추적 경로는 동일하게 남습니다.
          <br />
          본 콘텐츠의 저작권은 <b>해당 콘텐츠 제작 크리에이터</b>에게 있습니다.
        </div>

        <ul className="rules">
          <li>
            본 콘텐츠는 구매/구독자 본인의 개인적 시청 목적으로만 이용할 수 있습니다.
          </li>
          <li>
            계정 공유, 사전 동의 없는 2차 가공·캡처·무단 녹화, 타 플랫폼(SNS, 커뮤니티
            등) 재배포·판매를 금지합니다.
          </li>
          <li>
            위반이 확인되는 즉시 계정이 영구 정지되며, 저작권법 등 관련 법률에 따라
            민·형사상 책임을 물을 수 있습니다.
          </li>
        </ul>

        <div className="footer">
          TRACKING DATA IS RETAINED · LOCATION DOES NOT AFFECT IDENTIFICATION
        </div>

        <div className="continue" aria-hidden={!canContinue}>
          <span>계속 시청</span>
        </div>
      </div>
    </button>
  );
}
