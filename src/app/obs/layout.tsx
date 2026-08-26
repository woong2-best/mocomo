import type { ReactNode } from "react";

/** OBS browser source — no site chrome, transparent background. */
export default function ObsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body, .folk-app-shell {
              background: transparent !important;
              margin: 0 !important;
            }
            .folk-app-shell {
              min-height: auto !important;
            }
          `,
        }}
      />
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
    </>
  );
}
