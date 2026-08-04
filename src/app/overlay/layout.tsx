import type { ReactNode } from "react";

/** Minimal chrome for OBS browser sources — transparent page. */
export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
