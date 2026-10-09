import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
  type KeyboardEvent,
} from "react-native";

/**
 * Visible IME coverage from the bottom of the physical screen.
 * Android `height` often omits the suggestion/toolbar row; `screenY` is the
 * actual top of the IME window. Use screen (not window) height so a later
 * adjustResize does not collapse the value to 0.
 */
function overlapFromEvent(e: KeyboardEvent): number {
  const { height, screenY } = e.endCoordinates;
  if (Platform.OS === "ios") return Math.max(0, height);
  if (height <= 0 && screenY <= 0) return 0;
  const screenH = Dimensions.get("screen").height;
  const fromScreenY = screenY > 1 ? Math.max(0, screenH - screenY) : 0;
  return Math.max(0, height, fromScreenY);
}

/** Visible keyboard height — use with `useKeyboardLift` on bottom composers. */
export function useKeyboardBottomInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const apply = (e: KeyboardEvent) => setHeight(overlapFromEvent(e));
    const onHide = () => setHeight(0);
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, apply);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const changeSub =
      Platform.OS === "android"
        ? Keyboard.addListener("keyboardDidChangeFrame", apply)
        : null;
    return () => {
      showSub.remove();
      hideSub.remove();
      changeSub?.remove();
    };
  }, []);

  return height;
}

/**
 * Keyboard overlap not already handled by window resize (common on Android edge-to-edge).
 * Use as paddingBottom / marginBottom on bottom composers and sheets.
 */
export function useKeyboardLift() {
  const keyboardHeight = useKeyboardBottomInset();
  const { height: windowHeight } = useWindowDimensions();
  const relaxedHeightRef = useRef(windowHeight);
  if (keyboardHeight === 0) {
    relaxedHeightRef.current = windowHeight;
  }
  const resizedBy =
    Platform.OS === "android" && keyboardHeight > 0
      ? Math.max(0, relaxedHeightRef.current - windowHeight)
      : 0;
  const keyboardLift =
    Platform.OS === "ios"
      ? keyboardHeight
      : Math.max(0, keyboardHeight - resizedBy);
  return { keyboardHeight, keyboardLift };
}
