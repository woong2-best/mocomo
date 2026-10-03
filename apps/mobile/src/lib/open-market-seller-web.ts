import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchMarketSellAccess } from "@/api/commerce-market";
import { openMobileWebSession } from "@/lib/open-web-session";
import type { RootStackParamList } from "@/navigation/types";
import { showIslandError, showIslandPrompt } from "@/ui/IslandToast";
import { translate } from "@/i18n/runtime";

const APP_RETURN_PATH = "/market/app-return?target=MarketSellItem";

function sellerRegisterWebPath() {
  const returnParam = encodeURIComponent(APP_RETURN_PATH);
  return `/market/seller/register?app=1&return=${returnParam}`;
}

/** Sell listing and seller onboarding — web session instead of native. */
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
    /* Onboarding incomplete or API error — fall through to web register. */
  }

  await openMobileWebSession(sellerRegisterWebPath());
}

export function promptMarketSellerWebFlow(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  openWebAuth: (mode: "signin" | "signup") => Promise<unknown>,
  signedIn: boolean
) {
  if (!signedIn) {
    showIslandPrompt(translate("m.lib.sign_in_required"), translate("m.lib.please_sign_in_first_to_list"), {
      label: translate("auth.signIn"),
      onPress: () => void openWebAuth("signin"),
    });
    return;
  }
  void openMarketSellerWebFlow(navigation).catch(() => {
    showIslandError(translate("m.common.error"), translate("m.lib.could_not_open_the_seller_registration"));
  });
}
