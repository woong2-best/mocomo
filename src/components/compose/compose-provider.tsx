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
import { isAptPublicEnabled } from "@/lib/apt-public-gate";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { composeSheetRegionClass } from "@/lib/compose-sheet-layout";
import { safeRouterRefresh } from "@/lib/feed-overlay-guard";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
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
  /** APT 우편함 상호작용 — 확장형 시트 UI */
  viaMailbox?: boolean;
  quotedPostId?: string;
  quotedAuthorUsername?: string;
  quotedPreview?: string;
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
  const [quotedPostId, setQuotedPostId] = useState<string | undefined>();
  const [quotedAuthorUsername, setQuotedAuthorUsername] = useState<string | undefined>();
  const [quotedPreview, setQuotedPreview] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [pendingOpen, setPendingOpen] = useState<ComposeOptions | null>(null);

  const showComposeOverlay = useCallback((opts?: ComposeOptions) => {
    setCommunityId(opts?.communityId);
    setInitialContent(opts?.initialContent);
    setInitialTitle(opts?.initialTitle);
    setViaMailbox(Boolean(opts?.viaMailbox));
    setQuotedPostId(opts?.quotedPostId);
    setQuotedAuthorUsername(opts?.quotedAuthorUsername);
    setQuotedPreview(opts?.quotedPreview);
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
        const callback = pathname || DEFAULT_LANDING_PATH;
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent(callback)}`
        );
        return;
      }
      showComposeOverlay(opts);
    },
    [pathname, router, session?.user, showComposeOverlay, status]
  );

  useEffect(() => {
    if (status === "loading" || pendingOpen === null) return;
    const opts = pendingOpen;
    setPendingOpen(null);
    if (!session?.user) {
      const callback = pathname || DEFAULT_LANDING_PATH;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    showComposeOverlay(opts);
  }, [status, pendingOpen, session?.user, pathname, router, showComposeOverlay]);

  const closeCompose = useCallback(() => {
    setOpen(false);
  }, []);

  const handlePosted = useCallback(
    (_postId: string) => {
      setOpen(false);
      window.setTimeout(() => {
        try {
          safeRouterRefresh(() => router.refresh());
        } catch (e) {
          console.error("[compose] refresh", e);
        }
      }, 320);
    },
    [router]
  );

  const value = useMemo(
    () => ({ open, openCompose, closeCompose }),
    [open, openCompose, closeCompose]
  );

  const sheetRegion = composeSheetRegionClass(pathname || "/");
  const useFloatingInline = open && !viaMailbox;

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
              "fixed inset-0 z-[61] flex pointer-events-none p-3 sm:p-4",
              useFloatingInline
                ? "items-start justify-center pt-[max(4.5rem,10vh)] lg:pt-[12vh]"
                : "items-end justify-center p-0 lg:items-center lg:p-4",
              sheetRegion
            )}
          >
            <DialogPrimitive.Content
              className={cn(
                "pointer-events-auto flex w-full flex-col border border-border bg-background shadow-2xl outline-none",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                useFloatingInline
                  ? [
                      "max-w-[min(100%,34rem)] rounded-2xl",
                      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
                    ]
                  : [
                      "max-w-2xl max-h-[min(92vh,900px)] rounded-t-2xl lg:rounded-2xl lg:max-h-[min(85vh,720px)]",
                      "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300",
                      "lg:data-[state=closed]:slide-out-to-bottom-0 lg:data-[state=open]:slide-in-from-bottom-0",
                      "lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95 lg:duration-200",
                    ]
              )}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {useFloatingInline ? (
                <>
                  <div className="flex justify-end px-2 pt-2 shrink-0">
                    <DialogPrimitive.Close
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="닫기"
                    >
                      <X className="h-5 w-5" />
                    </DialogPrimitive.Close>
                  </div>
                  <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                    {open ? (
                      <ComposeForm
                        key={formKey}
                        communityId={communityId}
                        initialContent={initialContent}
                        initialTitle={initialTitle}
                        quotedPostId={quotedPostId}
                        quotedAuthorUsername={quotedAuthorUsername}
                        quotedPreview={quotedPreview}
                        variant="inline"
                        onPosted={handlePosted}
                        onNeedSignIn={() => {
                          closeCompose();
                          router.push(
                            `/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`
                          );
                        }}
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
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
                        {viaMailbox && isAptPublicEnabled() && (
                          <p className="text-sm text-muted-foreground mb-3 -mt-1">
                            APT 우편함에서 사진·영상·글을 올립니다.
                          </p>
                        )}
                        <ComposeForm
                          key={formKey}
                          communityId={communityId}
                          initialContent={initialContent}
                          initialTitle={initialTitle}
                          quotedPostId={quotedPostId}
                          quotedAuthorUsername={quotedAuthorUsername}
                          quotedPreview={quotedPreview}
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
                </>
              )}
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ComposeContext.Provider>
  );
}
