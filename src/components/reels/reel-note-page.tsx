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

/** Ruled note that fills the reel frame. `text` is one already-wrapped page. */
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
    <div className="absolute inset-0 bg-[#14110e]">
      <div
        ref={paperRef}
        className="absolute inset-3 overflow-hidden rounded-md bg-[#f6f1e4] text-[#221c16] shadow-[inset_0_0_0_1px_rgba(80,60,30,0.16)]"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${linePx - 1}px, rgba(90,62,28,0.22) ${linePx - 1}px ${linePx}px)`,
          backgroundSize: `100% ${linePx}px`,
          backgroundPosition: `0 ${NOTE_PAD_TOP_PX}px`,
        }}
      >
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
          {text}
        </p>
      </div>
    </div>
  );
}
