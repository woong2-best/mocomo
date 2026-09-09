import { useAuth } from "@/auth/AuthContext";

/** Whether like counts should be shown in feed UI (user preference). */
export function useShowLikeCounts(): boolean {
  const { user } = useAuth();
  return user?.preferences?.showLikeCounts !== false;
}
