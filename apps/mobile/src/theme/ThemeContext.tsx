import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  darkColors,
  lightColors,
  type ThemeColors,
} from "@/theme/tokens";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  /** Resolved mode from device Appearance (system). */
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: mode === "dark" ? darkColors : lightColors,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for rare trees outside provider (tests / early mount)
    return {
      mode: "light",
      isDark: false,
      colors: lightColors,
    };
  }
  return ctx;
}
