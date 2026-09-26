import { Linking } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { openUserProfile } from "@/features/profile/user-profile-nav";
import { normalizeUserLink } from "@/lib/linkify";
import type { RootStackParamList } from "@/navigation/types";
import { showIslandError } from "@/ui/IslandToast";

function isMocomoHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === "mocomo.net" || h.endsWith(".mocomo.net") || h.startsWith("localhost");
}

/** Open https links in browser; in-app routes for mocomo.net post/profile URLs. */
export async function openUserLink(
  raw: string,
  navigation?: NativeStackNavigationProp<RootStackParamList>
) {
  const href = normalizeUserLink(raw);
  if (!href) return;

  try {
    const u = new URL(href);
    if (navigation && isMocomoHost(u.hostname)) {
      const postId = u.pathname.match(/^\/post\/([^/?#]+)/i)?.[1];
      if (postId) {
        navigation.navigate("PostDetail", { id: postId });
        return;
      }
      const username = u.pathname.match(/^\/u\/([^/?#]+)/i)?.[1];
      if (username) {
        openUserProfile(navigation, { username: decodeURIComponent(username) });
        return;
      }
    }
  } catch {
    /* external fallback */
  }

  const opened = await Linking.canOpenURL(href).catch(() => false);
  if (!opened) {
    showIslandError("링크를 열 수 없습니다", href);
    return;
  }
  await Linking.openURL(href).catch(() => {
    showIslandError("링크를 열 수 없습니다", "브라우저에서 열지 못했습니다.");
  });
}
