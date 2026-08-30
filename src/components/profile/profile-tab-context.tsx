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
  prefetchQuery: (patch: Partial<ProfileTabQuery>) => void;
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
  if (query.sort !== "new") params.set("sort", query.sort);
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

  const resolveQuery = useCallback(
    (patch: Partial<ProfileTabQuery>, base: ProfileTabQuery): ProfileTabQuery => {
      const next: ProfileTabQuery = {
        tab: patch.tab ?? base.tab,
        sort: patch.sort ?? base.sort,
        kind: patch.kind ?? base.kind,
      };
      if (next.tab !== "media") {
        next.kind = "all";
      } else if (patch.tab === "media" && !patch.kind) {
        next.kind = "photo";
      }
      return next;
    },
    []
  );

  const prefetchQuery = useCallback(
    (patch: Partial<ProfileTabQuery>) => {
      prefetchHref(buildHref(resolveQuery(patch, active)));
    },
    [active, buildHref, prefetchHref, resolveQuery]
  );

  // Twitter-style: prefetch adjacent tabs only when idle — not all 15 combos on mount.
  useEffect(() => {
    const tabs: ProfileTab[] = ["posts", "replies", "media", "wiki", "likes"];
    const idx = tabs.indexOf(active.tab);
    const neighbors = [tabs[idx - 1], tabs[idx + 1]].filter(
      (tab): tab is ProfileTab => tab != null
    );

    const run = () => {
      for (const tab of neighbors) {
        prefetchQuery({ tab });
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(run, 1200);
    return () => clearTimeout(timer);
  }, [active.tab, prefetchQuery]);

  const navigate = useCallback(
    (patch: Partial<ProfileTabQuery>) => {
      const next = resolveQuery(patch, active);
      setOptimistic(next);
      const href = buildHref(next);
      prefetchHref(href);
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [active, buildHref, prefetchHref, resolveQuery, router]
  );

  const value = useMemo<ProfileTabContextValue>(
    () => ({
      username,
      basePath,
      tab: active.tab,
      sort: active.sort,
      kind: active.kind,
      navigate,
      prefetchQuery,
      buildHref,
      isPending,
    }),
    [
      username,
      basePath,
      active.tab,
      active.sort,
      active.kind,
      navigate,
      prefetchQuery,
      buildHref,
      isPending,
    ]
  );

  return <ProfileTabContext.Provider value={value}>{children}</ProfileTabContext.Provider>;
}

export function useProfileTab() {
  const ctx = useContext(ProfileTabContext);
  if (!ctx) throw new Error("useProfileTab must be used within ProfileTabProvider");
  return ctx;
}
