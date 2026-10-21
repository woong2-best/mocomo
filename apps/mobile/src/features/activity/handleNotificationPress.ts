import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NotificationItem } from "@/api/notifications";
import type { RootStackParamList } from "@/navigation/types";
import { resolveMobileNotificationRoute } from "@/lib/notification-routing";

export function handleNotificationPress(
  item: NotificationItem,
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  const route = resolveMobileNotificationRoute({
    type: item.type,
    link: item.link,
    actor: item.actor,
  });
  if (!route) return;

  switch (route.name) {
    case "MessageRoom":
      navigation.navigate("MessageRoom", route.params);
      break;
    case "PostDetail":
      navigation.navigate("PostDetail", route.params);
      break;
    case "UserProfile":
      navigation.navigate("UserProfile", route.params);
      break;
    case "LiveDetail":
      navigation.navigate("LiveDetail", route.params);
      break;
    case "MarketplaceDetail":
      navigation.navigate("MarketplaceDetail", route.params);
      break;
  }
}
