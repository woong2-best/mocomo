import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import { darkColors, lightColors } from "@/theme/tokens";

export const folkLightNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.terracotta,
    background: lightColors.background,
    card: lightColors.surfaceRaised,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.terracotta,
  },
};

export const folkDarkNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.terracotta,
    background: darkColors.background,
    card: darkColors.surfaceRaised,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.terracotta,
  },
};
