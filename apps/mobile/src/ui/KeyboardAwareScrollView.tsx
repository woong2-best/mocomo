import { createContext, forwardRef, useContext, useRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
} from "react-native";
import { useScrollFieldAboveKeyboard } from "@/lib/use-scroll-field-above-keyboard";

const FocusCtx = createContext<(input: TextInput | null) => void>(() => {});

export function KeyboardAwareFocusProvider({
  onInputFocus,
  children,
}: {
  onInputFocus: (input: TextInput | null) => void;
  children: ReactNode;
}) {
  return <FocusCtx.Provider value={onInputFocus}>{children}</FocusCtx.Provider>;
}

type FieldProps = TextInputProps & { nestedScrollEnabled?: boolean };

export const KeyboardAwareTextInput = forwardRef<TextInput, FieldProps>(
  function KeyboardAwareTextInput(props, ref) {
    const onInputFocus = useContext(FocusCtx);
    const innerRef = useRef<TextInput>(null);
    return (
      <TextInput
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        {...props}
        onFocus={(e) => {
          onInputFocus(innerRef.current);
          props.onFocus?.(e);
        }}
      />
    );
  }
);

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  style,
  onScroll,
  ...rest
}: ScrollViewProps) {
  const { scrollRef, frameRef, keyboardLift, onScrollOffset, onInputFocus } =
    useScrollFieldAboveKeyboard();
  const flat = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePad = typeof flat.paddingBottom === "number" ? flat.paddingBottom : 24;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View ref={frameRef} style={{ flex: 1, marginBottom: keyboardLift }}>
        <FocusCtx.Provider value={onInputFocus}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            {...rest}
            style={[{ flex: 1 }, style]}
            contentContainerStyle={[contentContainerStyle, { paddingBottom: basePad + keyboardLift }]}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            onScroll={(e) => {
              onScrollOffset(e.nativeEvent.contentOffset.y);
              onScroll?.(e);
            }}
            scrollEventThrottle={rest.scrollEventThrottle ?? 16}
          >
            {children}
          </ScrollView>
        </FocusCtx.Provider>
      </View>
    </KeyboardAvoidingView>
  );
}
