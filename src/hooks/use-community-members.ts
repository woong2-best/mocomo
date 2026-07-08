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
    refetchInterval: 60_000,
  });
}
