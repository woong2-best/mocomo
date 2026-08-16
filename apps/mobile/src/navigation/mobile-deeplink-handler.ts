import * as Linking from "expo-linking";
import { navigateFromPush } from "@/navigation/navigationRef";

const ROUTE_ALIASES: Record<string, keyof import("@/navigation/types").RootStackParamList> = {
  MarketSellItem: "MarketSellItem",
  SellerListings: "SellerListings",
  Market: "Main",
};

function pathFromOpenUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  if (parsed.hostname !== "open") return null;
  const path = parsed.queryParams?.path;
  return typeof path === "string" ? path : null;
}

export function handleMobileDeepLink(url: string): boolean {
  const path = pathFromOpenUrl(url);
  if (!path) return false;

  const screen = ROUTE_ALIASES[path];
  if (screen === "Main") {
    return navigateFromPush("Main", { screen: "Market" });
  }
  if (screen) {
    return navigateFromPush(screen);
  }
  return false;
}

export function subscribeMobileDeepLinks() {
  const onUrl = ({ url }: { url: string }) => {
    handleMobileDeepLink(url);
  };

  void Linking.getInitialURL().then((url) => {
    if (url) handleMobileDeepLink(url);
  });

  const sub = Linking.addEventListener("url", onUrl);
  return () => sub.remove();
}
