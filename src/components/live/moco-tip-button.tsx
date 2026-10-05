"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const CHEESE_ORANGE = "#FF7800";

type Props = React.ComponentPropsWithoutRef<"button"> & {
  size?: number;
};

/** Chzzk-style cheese — orange squircle with white $. */
export const MocoTipButton = forwardRef<HTMLButtonElement, Props>(function MocoTipButton(
  { className, size = 36, type = "button", style, ...props },
  ref
) {
  const radius = Math.round(size * 0.26);
  const fontSize = Math.round(size * 0.52);

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold leading-none text-white transition-opacity disabled:opacity-45",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: CHEESE_ORANGE,
        fontSize,
        ...style,
      }}
      {...props}
    >
      $
    </button>
  );
});
