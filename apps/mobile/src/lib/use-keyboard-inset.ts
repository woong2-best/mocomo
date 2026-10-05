import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, useWindowDimensions, type KeyboardEvent } from "react-native";

/** Visible keyboard height — use marginBottom on bottom sheets to lift above keyboard. */
export function useKeyboardBottomInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates.height);
    const onHide = () => setHeight(0);
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
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
