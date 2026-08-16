import { Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchMarketSellAccess } from "@/api/commerce-market";
import { openMobileWebSession } from "@/lib/open-web-session";
import type { RootStackParamList } from "@/navigation/types";

const APP_RETURN_PATH = "/market/app-return?target=MarketSellItem";

function sellerRegisterWebPath() {
  const returnParam = encodeURIComponent(APP_RETURN_PATH);
  return `/market/seller/register?app=1&return=${returnParam}`;
}

/** 판매 등록 · 판매자 온보딩 — 네이티브 대신 웹(세션 연동) */
export async function openMarketSellerWebFlow(
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  try {
    const gate = await fetchMarketSellAccess();
    if (gate.allowed) {
      navigation.navigate("MarketSellItem");
      return;
    }
  } catch {
    /* 온보딩 미완료 또는 API 오류 → 웹 등록으로 */
  }

  await openMobileWebSession(sellerRegisterWebPath());
}

export function promptMarketSellerWebFlow(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  openWebAuth: (mode: "signin" | "signup") => Promise<void>,
  signedIn: boolean
) {
  if (!signedIn) {
    Alert.alert("로그인 필요", "판매 등록을 위해 먼저 로그인해 주세요.", [
      { text: "취소", style: "cancel" },
      { text: "로그인", onPress: () => void openWebAuth("signin") },
    ]);
    return;
  }
  void openMarketSellerWebFlow(navigation).catch(() => {
    Alert.alert("오류", "판매자 등록 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });
}
