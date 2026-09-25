import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./App";

try {
  require("@/push/push-background-task");
} catch {
  /* TaskManager must not kill cold start */
}

// Do NOT register LiveKit/WebRTC globals here — that blocks cold start.
// See src/native/livekit-bootstrap.ts (called from Live / DM call screens).

registerRootComponent(App);
