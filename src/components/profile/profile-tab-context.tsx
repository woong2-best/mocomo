"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  parseProfileMediaKind,
  parseProfileSort,
  parseProfileTab,
  type ProfileMediaKind,
  type ProfileSort,
  type ProfileTab,
} from "@/lib/profile-queries";

type ProfileTabQuery = {
  tab: ProfileTab;
  sort: ProfileSort;
  kind: ProfileMediaKind;
};

type ProfileTabContextValue = ProfileTabQuery & {
  username: string;
  basePath: string;
  navigate: (patch: Partial<ProfileTabQuery>) => void;
  buildHref: (query: ProfileTabQuery) => string;
  isPending: boolean;
};

const ProfileTabContext = createContext<ProfileTabContextValue | null>(null);

function readQuery(searchParams: URLSearchParams): ProfileTabQuery {
  return {
    tab: parseProfileTab(searchParams.get("tab")),
    sort: parseProfileSort(searchParams.get("sort")),
    kind: parseProfileMediaKind(searchParams.get("kind")),
  };
}

function buildProfileHref(basePath: string, query: ProfileTabQuery) {
  const params = new URLSearchParams();
  if (query.tab !== "posts") params.set("tab", query.tab);
  if (query.sort === "popular") params.set("sort", "popular");
  if (query.tab === "media" && query.kind !== "all") params.set("kind", query.kind);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function ProfileTabProvider({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = `/u/${username}`;
  const urlQuery = useMemo(() => readQuery(searchParams), [searchParams]);
  const [optimistic, setOptimistic] = useState<ProfileTabQuery | null>(null);
  const [isPending, startTransition] = useTransition();
  const prefetched = useRef(new Set<string>());

  const active = optimistic ?? urlQuery;

  useEffect(() => {
    setOptimistic(null);
  }, [urlQuery.tab, urlQuery.sort, urlQuery.kind]);

  const buildHref = useCallback(
    (query: ProfileTabQuery) => buildProfileHref(basePath, query),
    [basePath]
  );

  const prefetchHref = useCallback(
    (href: string) => {
      if (prefetched.current.has(href)) return;
      prefetched.current.add(href);
      router.prefetch(href);
    },
    [router]
  );

  useEffect(() => {
    const tabs: ProfileTab[] = ["posts", "replies", "media", "wiki", "likes"];
    for (const tab of tabs) {
      prefetchHref(buildHref({ tab, sort: "new", kind: tab === "media" ? "photo" : "all" }));
      prefetchHref(buildHref({ tab, sort: "popular", kind: tab === "media" ? "photo" : "all" }));
    }
  }, [buildHref, prefetchHref]);

  const navigate = useCallback(
    (patch: Partial<ProfileTabQuery>) => {
      const next: ProfileTabQuery = {
        tab: patch.tab ?? active.tab,
        sort: patch.sort ?? active.sort,
        kind: patch.kind ?? active.kind,
      };
      if (next.tab !== "media") {
        next.kind = "all";
      } else if (patch.tab === "media" && !patch.kind) {
        next.kind = "photo";
      }
      setOptimistic(next);
      const href = buildHref(next);
      prefetchHref(href);
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [active.tab, active.sort, active.kind, buildHref, prefetchHref, router]
  );

  const value = useMemo<ProfileTabContextValue>(
    () => ({
      username,
      basePath,
      tab: active.tab,
      sort: active.sort,
      kind: active.kind,
      navigate,
      buildHref,
      isPending,
    }),
    [username, basePath, active.tab, active.sort, active.kind, navigate, buildHref, isPending]
  );

  return <ProfileTabContext.Provider value={value}>{children}</ProfileTabContext.Provider>;
}

export function useProfileTab() {
  const ctx = useContext(ProfileTabContext);
  if (!ctx) throw new Error("useProfileTab must be used within ProfileTabProvider");
  return ctx;
}
