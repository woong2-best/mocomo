import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SavedMobileAccountPublic } from "@/auth/account-store";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { radii } from "@/theme/tokens";

type Props = {
  visible: boolean;
  accounts: SavedMobileAccountPublic[];
  busyId: string | null;
  onSelect: (account: SavedMobileAccountPublic) => void;
  onAddAccount: () => void;
  onUsernameLogin: () => void;
  onClose: () => void;
};

/** X-style saved account picker on sign-in. */
export function WelcomeAccountPickerSheet({
  visible,
  accounts,
  busyId,
  onSelect,
  onAddAccount,
  onUsernameLogin,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.title}>계정 선택</Text>
          <Text style={styles.sub}>MoCoMo 계정으로 계속</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {accounts.map((account) => (
              <Pressable
                key={account.userId}
                style={styles.row}
                onPress={() => onSelect(account)}
                disabled={busyId !== null}
              >
                <FolkAvatar
                  uri={account.image}
                  name={account.name || account.username}
                  size={40}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {account.name || account.username}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    @{account.username}
                  </Text>
                </View>
                {busyId === account.userId ? (
                  <ActivityIndicator color="#E7E9EA" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#71767B" />
                )}
              </Pressable>
            ))}

            <Pressable style={styles.addRow} onPress={onAddAccount}>
              <View style={styles.addIcon}>
                <Ionicons name="person-add-outline" size={20} color="#E7E9EA" />
              </View>
              <Text style={styles.addText}>다른 계정 추가</Text>
            </Pressable>
          </ScrollView>
        </View>

        <Pressable style={styles.usernameLink} onPress={onUsernameLogin}>
          <Text style={styles.usernameText}>사용자 아이디로 로그인 ›</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#000",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#2F3336",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
    maxHeight: "72%",
  },
  logo: { width: 32, height: 32, alignSelf: "center", marginBottom: 16 },
  title: {
    color: "#E7E9EA",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  sub: {
    color: "#71767B",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2F3336",
  },
  rowText: { flex: 1 },
  name: { color: "#E7E9EA", fontSize: 16, fontWeight: "700" },
  email: { color: "#71767B", fontSize: 14, marginTop: 2 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16181C",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#E7E9EA", fontSize: 15, fontWeight: "600" },
  usernameLink: { alignItems: "center", marginTop: 24 },
  usernameText: { color: "#E7E9EA", fontSize: 15, fontWeight: "700" },
});
