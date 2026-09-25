import { useRoute, type RouteProp } from "@react-navigation/native";
import { SharedProfileScreen } from "@/features/profile/SharedProfileScreen";
import type { RootStackParamList } from "@/navigation/types";

/** Other user's profile — same chrome as own profile. */
export function UserProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "UserProfile">>();
  const { username, name, image } = route.params;
  return (
    <SharedProfileScreen
      key={username}
      username={username}
      showBack
      preview={{ username, name, image }}
    />
  );
}
