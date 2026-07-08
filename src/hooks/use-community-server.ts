import { useQuery } from "@tanstack/react-query";
import type { CommunityServerContext } from "@/lib/community-server/types";

export function useCommunityServer(slug: string, initial?: CommunityServerContext | null) {
  return useQuery({
    queryKey: ["community-server", slug],
    queryFn: async () => {
      const res = await fetch(`/api/community/${encodeURIComponent(slug)}/server`);
      if (!res.ok) throw new Error("Failed to load community");
      return res.json() as Promise<CommunityServerContext>;
    },
    initialData: initial ?? undefined,
    enabled: !!slug,
  });
}
