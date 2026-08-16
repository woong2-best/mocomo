import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { promptMarketSellerWebFlow } from "@/lib/open-market-seller-web";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** 레거시 라우트 — 판매자 온보딩은 웹 전용. 진입 시 브라우저로 바로 연다. */
export function SellerRegisterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, openWebAuth } = useAuth();

  useEffect(() => {
    promptMarketSellerWebFlow(navigation, openWebAuth, status === "signedIn");
    const timer = setTimeout(() => {
      if (navigation.canGoBack()) navigation.goBack();
    }, 600);
    return () => clearTimeout(timer);
  }, [navigation, openWebAuth, status]);

  return (
    <Screen>
      <AppHeader title="판매자 등록" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.center}>
        <ActivityIndicator color={colors.terracotta} />
        <Text style={styles.text}>웹 판매자 등록 페이지를 여는 중…</Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.lg,
    },
    text: { fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
  });
}
