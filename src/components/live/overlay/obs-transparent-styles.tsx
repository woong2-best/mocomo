/** Force OBS browser sources to stay see-through when idle. */
export function ObsTransparentStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          html,
          body,
          .folk-canvas,
          .folk-app-shell {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .folk-app-shell {
            isolation: auto !important;
          }
        `,
      }}
    />
  );
}
