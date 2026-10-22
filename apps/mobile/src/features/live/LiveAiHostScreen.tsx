import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiLiveRoom } from "@/features/live/ai/AiLiveRoom";
import type { RootStackParamList } from "@/navigation/types";

export function LiveAiHostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <AiLiveRoom topInset={insets.top + 8} onBack={() => navigation.goBack()} />
    </View>
  );
}
