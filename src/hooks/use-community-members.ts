import { useQuery } from "@tanstack/react-query";
import type { CommunityMemberView } from "@/lib/community-server/types";

export function useCommunityMembers(communityId: string, initial?: CommunityMemberView[]) {
  return useQuery({
    queryKey: ["community-members", communityId],
    queryFn: async () => {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 6_000);
      try {
        const res = await fetch(`/api/community/${communityId}/members`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) return [] as CommunityMemberView[];
        const data = await res.json();
        return (data.members ?? []) as CommunityMemberView[];
      } catch {
        return [] as CommunityMemberView[];
      } finally {
        window.clearTimeout(timer);
      }
    },
    initialData: initial,
    enabled: !!communityId,
    staleTime: 120_000,
    // 진입 직후 세션·토큰과 경쟁하지 않도록 폴링/즉시 refetch 끔
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
}
