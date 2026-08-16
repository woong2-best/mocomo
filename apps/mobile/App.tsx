import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { createAppQueryClient } from "@/api/query-client";
import { AuthProvider } from "@/auth/AuthContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { perfMark } from "@/perf/mark";

perfMark("app_start");
// Needed for OAuth redirect completion without eagerly loading full oauth helpers.
WebBrowser.maybeCompleteAuthSession();

function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar style={colors.statusBarStyle} />;
}

/**
 * MoCoMo mobile entry — React Native (Expo New Architecture).
 * Not a WebView shell. Web UI code must not be imported here.
 */
export default function App() {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
              <ThemedStatusBar />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
