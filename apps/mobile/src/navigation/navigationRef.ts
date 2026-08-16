import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateFromPush(name: keyof RootStackParamList, params?: object) {
  if (!navigationRef.isReady()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigationRef.navigate(name as any, params as any);
  return true;
}
