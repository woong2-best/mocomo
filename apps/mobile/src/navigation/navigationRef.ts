import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateFromPush(name: keyof RootStackParamList, params?: object) {
  if (!navigationRef.isReady()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigationRef.navigate(name as any, params as any);
  return true;
}

/** Land on Home as the active account — used after adding/switching accounts. */
export function goToSignedInHome() {
  void import("@/auth/oauth")
    .then(({ dismissAuthOverlays }) => dismissAuthOverlays())
    .catch(() => undefined);
  if (!navigationRef.isReady()) return;
  const names = navigationRef.getRootState()?.routeNames ?? [];
  if (!names.includes("Main")) return;
  const current = navigationRef.getCurrentRoute()?.name;
  if (current === "Login" || current === "Signup" || current === "PasswordReset") {
    navigationRef.reset({ index: 0, routes: [{ name: "Main" }] });
    return;
  }
  navigationRef.navigate("Main", { screen: "Home" });
}
