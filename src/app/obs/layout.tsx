import type { ReactNode } from "react";
import { ObsTransparentStyles } from "@/components/live/overlay/obs-transparent-styles";

/** OBS browser source — no site chrome, transparent background. */
export default function ObsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ObsTransparentStyles />
      <div style={{ margin: 0, background: "transparent", overflow: "hidden" }}>{children}</div>
    </>
  );
}
