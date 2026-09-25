import { useEffect, useRef } from "react";
import {
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
  type TextInput,
} from "react-native";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";

/**
 * Keeps the focused field above the keyboard.
 * adjustResize / edge-to-edge often still leaves the caret under the IME,
 * so the scroll view shrinks by any keyboard height the window did not
 * already absorb, then the field is scrolled into that frame.
 */
export function useScrollFieldAboveKeyboard() {
  const keyboardHeight = useKeyboardBottomInset();
  const { height: windowHeight } = useWindowDimensions();
  const relaxedHeightRef = useRef(windowHeight);
  const scrollRef = useRef<ScrollView>(null);
  const frameRef = useRef<View>(null);
  const scrollY = useRef(0);
  const focusedRef = useRef<TextInput | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (keyboardHeight === 0) {
    relaxedHeightRef.current = windowHeight;
  }

  const resizedBy =
    Platform.OS === "android" && keyboardHeight > 0
      ? Math.max(0, relaxedHeightRef.current - windowHeight)
      : 0;
  const keyboardLift =
    Platform.OS === "android" && keyboardHeight > 0
      ? Math.max(0, keyboardHeight - resizedBy)
      : 0;

  const revealRef = useRef(() => {});
  revealRef.current = () => {
    const input = focusedRef.current;
    const scroll = scrollRef.current;
    const frame = frameRef.current;
    if (!input || !scroll || !frame) return;
    input.measureInWindow((_x, y, _w, h) => {
      frame.measureInWindow((_sx, sy, _sw, sh) => {
        if (sh <= 0 || h <= 0) return;
        const pad = 20;
        const visibleTop = sy + pad;
        const visibleBottom = sy + sh - pad;
        let delta = 0;
        if (h + pad * 2 >= sh) {
          delta = y - visibleTop;
        } else if (y + h > visibleBottom) {
          delta = y + h - visibleBottom;
        } else if (y < visibleTop) {
          delta = y - visibleTop;
        }
        if (Math.abs(delta) < 2) return;
        scroll.scrollTo({
          y: Math.max(0, scrollY.current + delta),
          animated: true,
        });
      });
    });
  };

  const scheduleReveal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      revealRef.current();
    }, 60);
  };

  useEffect(() => {
    if (keyboardHeight <= 0) return;
    scheduleReveal();
    const later = setTimeout(() => revealRef.current(), 280);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      clearTimeout(later);
    };
  }, [keyboardHeight, keyboardLift, windowHeight]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    scrollRef,
    /** View that stays above the keyboard. Its frame is what the field must fit inside. */
    frameRef,
    /** Extra space the keyboard still covers after any window resize. */
    keyboardLift,
    onScrollOffset: (y: number) => {
      scrollY.current = y;
    },
    onInputFocus: (input: TextInput | null) => {
      focusedRef.current = input;
      scheduleReveal();
    },
  };
}
