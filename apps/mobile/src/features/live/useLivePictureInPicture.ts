import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  enterLivePip,
  isLivePipSupported,
  setLivePipEnabled,
  subscribeLivePipMode,
} from "mocomo-live-pip";

/**
 * Enables Android Activity PiP (and reports active state) while a first-party
 * live is playing. iOS auto-PiP is handled on VideoTrack via iosPIP props.
 */
export function useLivePictureInPicture(active: boolean) {
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    if (!active || Platform.OS !== "android" || !isLivePipSupported()) {
      void setLivePipEnabled(false);
      setInPip(false);
      return;
    }

    void setLivePipEnabled(true, { width: 16, height: 9 });
    const unsub = subscribeLivePipMode(setInPip);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        // API 26–30: nudge enter; API 31+ uses setAutoEnterEnabled on the Activity.
        void enterLivePip({ width: 16, height: 9 }).catch(() => undefined);
      }
    });

    return () => {
      unsub();
      sub.remove();
      void setLivePipEnabled(false);
      setInPip(false);
    };
  }, [active]);

  return { inPip, supported: isLivePipSupported() };
}
