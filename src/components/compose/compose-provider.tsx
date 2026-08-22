"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { composeSheetRegionClass } from "@/lib/compose-sheet-layout";
import { safeRouterRefresh } from "@/lib/feed-overlay-guard";
import { cn } from "@/lib/utils";

const ComposeForm = dynamic(
  () => import("@/components/compose/compose-form").then((m) => m.ComposeForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        작성 도구 불러오는 중…
      </div>
    ),
  }
);

type ComposeOptions = {
  communityId?: string;
  initialContent?: string;
  initialTitle?: string;
  /** APT 우편함 상호작용으로만 글쓰기 시트를 엽니다 */
  viaMailbox?: boolean;
};

type ComposeContextValue = {
  open: boolean;
  openCompose: (opts?: ComposeOptions) => void;
  closeCompose: () => void;
};

const ComposeContext = createContext<ComposeContextValue | null>(null);

export function useCompose() {
  const ctx = useContext(ComposeContext);
  if (!ctx) {
    throw new Error("useCompose must be used within ComposeProvider");
  }
  return ctx;
}

/** optional hook for places that may render outside provider in tests */
export function useComposeOptional() {
  return useContext(ComposeContext);
}

export function ComposeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [communityId, setCommunityId] = useState<string | undefined>();
  const [initialContent, setInitialContent] = useState<string | undefined>();
  const [initialTitle, setInitialTitle] = useState<string | undefined>();
  const [viaMailbox, setViaMailbox] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pendingOpen, setPendingOpen] = useState<ComposeOptions | null>(null);

  const showComposeSheet = useCallback((opts?: ComposeOptions) => {
    setCommunityId(opts?.communityId);
    setInitialContent(opts?.initialContent);
    setInitialTitle(opts?.initialTitle);
    setViaMailbox(Boolean(opts?.viaMailbox));
    setFormKey((k) => k + 1);
    setOpen(true);
  }, []);

  const openCompose = useCallback(
    (opts?: ComposeOptions) => {
      if (status === "loading") {
        setPendingOpen(opts ?? {});
        return;
      }
      if (!session?.user) {
        const callback = pathname || "/";
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent(callback)}`
        );
        return;
      }
      showComposeSheet(opts);
    },
    [pathname, router, session?.user, showComposeSheet, status]
  );

  useEffect(() => {
    if (status === "loading" || pendingOpen === null) return;
    const opts = pendingOpen;
    setPendingOpen(null);
    if (!session?.user) {
      const callback = pathname || "/";
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    showComposeSheet(opts);
  }, [status, pendingOpen, session?.user, pathname, router, showComposeSheet]);

  const closeCompose = useCallback(() => {
    setOpen(false);
  }, []);

  const handlePosted = useCallback((_postId: string) => {
    setOpen(false);
    // toast가 sheet 위에 보이도록 먼저 닫고, 잠시 뒤 피드 갱신
    window.setTimeout(() => {
      try {
        const main = document.getElementById("mocomo-main-scroll");
        main?.scrollTo({ top: 0, behavior: "smooth" });
        safeRouterRefresh(() => router.refresh());
      } catch (e) {
        console.error("[compose] refresh", e);
      }
    }, 320);
  }, [router]);

  const value = useMemo(
    () => ({ open, openCompose, closeCompose }),
    [open, openCompose, closeCompose]
  );

  const sheetRegion = composeSheetRegionClass(pathname || "/");

  return (
    <ComposeContext.Provider value={value}>
      {children}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              sheetRegion
            )}
          />
          <div
            className={cn(
              "fixed inset-0 z-[61] flex items-end justify-center p-0 pointer-events-none lg:items-center lg:p-4",
              sheetRegion
            )}
          >
            <DialogPrimitive.Content
              className={cn(
                "pointer-events-auto flex w-full max-w-2xl flex-col border border-border bg-background shadow-2xl outline-none",
                "max-h-[min(92vh,900px)] rounded-t-2xl lg:rounded-2xl lg:max-h-[min(85vh,720px)]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300",
                "lg:data-[state=closed]:slide-out-to-bottom-0 lg:data-[state=open]:slide-in-from-bottom-0",
                "lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95 lg:duration-200"
              )}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
            <div className="flex shrink-0 justify-center pt-3 pb-1 lg:hidden">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <DialogPrimitive.Title className="text-lg font-bold">
                {viaMailbox ? "우편함" : "글쓰기"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="rounded-full p-2 hover:bg-muted"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pb-safe">
              {open ? (
                <>
                  {viaMailbox && (
                    <p className="text-sm text-muted-foreground mb-3 -mt-1">
                      APT 우편함에서 사진·영상·글을 올립니다.
                    </p>
                  )}
                  <ComposeForm
                  key={formKey}
                  communityId={communityId}
                  initialContent={initialContent}
                  initialTitle={initialTitle}
                  variant="sheet"
                  onPosted={handlePosted}
                  onNeedSignIn={() => {
                    closeCompose();
                    router.push(
                      `/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`
                    );
                  }}
                />
                </>
              ) : null}
            </div>
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

    </ComposeContext.Provider>
  );
}
