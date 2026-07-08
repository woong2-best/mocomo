import { useQuery } from "@tanstack/react-query";
import type { CommunityMemberView } from "@/lib/community-server/types";

export function useCommunityMembers(communityId: string, initial?: CommunityMemberView[]) {
  return useQuery({
    queryKey: ["community-members", communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${communityId}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      return data.members as CommunityMemberView[];
    },
    initialData: initial,
    enabled: !!communityId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnMount: initial && initial.length > 0 ? false : true,
  });
}
