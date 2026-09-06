import "react-native-gesture-handler";
import "@/push/push-background-task";
import { registerRootComponent } from "expo";

import App from "./App";

// Do NOT register LiveKit/WebRTC globals here — that blocks cold start.
// See src/native/livekit-bootstrap.ts (called from Live / DM call screens).

registerRootComponent(App);
