import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

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
