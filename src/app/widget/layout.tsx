import type { ReactNode } from "react";
import { ObsTransparentStyles } from "@/components/live/overlay/obs-transparent-styles";

/** Legacy /widget/alert OBS source — same transparent shell as /overlay. */
export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ObsTransparentStyles />
      <div style={{ margin: 0, background: "transparent", overflow: "hidden" }}>{children}</div>
    </>
  );
}
