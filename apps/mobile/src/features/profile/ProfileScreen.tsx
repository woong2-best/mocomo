import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { SharedProfileScreen } from "@/features/profile/SharedProfileScreen";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";

/** Own profile — web `/u/[username]` parity. */
export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, status } = useAuth();

  if (status === "loading" || !user?.username) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      </Screen>
    );
  }

  return <SharedProfileScreen username={user.username} showBack />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
