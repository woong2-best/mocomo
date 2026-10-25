"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  NOTE_PAD_BOTTOM_PX,
  NOTE_PAD_LEFT_PX,
  NOTE_PAD_RIGHT_PX,
  NOTE_PAD_TOP_PX,
} from "@/lib/reels/text-pages";

/** A short note stays readable. A page of text stretches until it meets the author. */
const MAX_LINE_PX = 96;

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*)/gu;

/** Black note. Typed glyphs are white; emoji keep their own color. */
export function ReelNotePage({ text }: { text: string }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const lines = Math.max(1, text.split("\n").length);
  const [linePx, setLinePx] = useState(32);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const apply = () => {
      const textH = paper.clientHeight - NOTE_PAD_TOP_PX - NOTE_PAD_BOTTOM_PX;
      const next = Math.min(MAX_LINE_PX, Math.max(32, textH / lines));
      setLinePx((prev) => (Math.abs(prev - next) < 0.4 ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [lines]);

  return (
    <div ref={paperRef} className="absolute inset-0 overflow-hidden bg-black">
      <p
        className="whitespace-pre-wrap font-medium"
        style={{
          paddingTop: NOTE_PAD_TOP_PX,
          paddingRight: NOTE_PAD_RIGHT_PX,
          paddingLeft: NOTE_PAD_LEFT_PX,
          fontSize: 17,
          lineHeight: `${linePx}px`,
          textAlign: "justify",
          textAlignLast: "start",
          textJustify: "inter-character",
        }}
      >
        {text.split(EMOJI_RE).map((part, i) =>
          i % 2 === 1 ? (
            <span key={i}>{part}</span>
          ) : (
            <span key={i} className="text-white">
              {part}
            </span>
          )
        )}
      </p>
    </div>
  );
}
