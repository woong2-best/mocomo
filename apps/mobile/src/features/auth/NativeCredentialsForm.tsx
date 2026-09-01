import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  busy?: boolean;
  error?: string;
  showSubmit?: boolean;
  onSubmit: (loginId: string, password: string) => void;
  onFieldFocus?: () => void;
};

export type NativeCredentialsFormHandle = {
  focusLogin: () => void;
};

/** Native @username + password — mirrors web sign-in form. */
export const NativeCredentialsForm = forwardRef<NativeCredentialsFormHandle, Props>(
  function NativeCredentialsForm({ busy, error, showSubmit = true, onSubmit, onFieldFocus }, ref) {
  const { colors } = useTheme();
  const loginRef = useRef<TextInputType>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useImperativeHandle(ref, () => ({
    focusLogin: () => loginRef.current?.focus(),
  }));

  const canSubmit = loginId.trim().length > 0 && password.length > 0 && !busy;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.fieldRow,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        ]}
      >
        <Text style={[styles.at, { color: colors.brand }]}>@</Text>
        <TextInput
          ref={loginRef}
          value={loginId}
          onChangeText={setLoginId}
          placeholder="사용자 아이디"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onFocus={onFieldFocus}
          style={[styles.input, { color: colors.text }]}
          editable={!busy}
        />
      </View>

      <View
        style={[
          styles.fieldRow,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        ]}
      >
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onFocus={onFieldFocus}
          onSubmitEditing={() => {
            if (canSubmit) onSubmit(loginId, password);
          }}
          style={[styles.input, styles.passwordInput, { color: colors.text }]}
          editable={!busy}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          accessibilityLabel={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      {showSubmit ? (
        <FolkButton
          label="로그인"
          loading={busy}
          disabled={!canSubmit}
          onPress={() => onSubmit(loginId, password)}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  at: {
    fontSize: 17,
    fontWeight: "800",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 12,
  },
  passwordInput: { paddingRight: 8 },
  error: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});