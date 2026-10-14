"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  isTermsGateExemptPagePath,
  TERMS_REQUIRED_CODE,
} from "@/lib/legal/terms-gate-shared";
import { TERMS_OF_SERVICE_REVIEW_PATH } from "@/lib/legal/terms-versions";
import {
  TermsAgreementModal,
  type TermsAgreementInfo,
} from "@/components/legal/terms-agreement-modal";

type TermsStatusResponse = {
  required?: boolean;
  terms?: TermsAgreementInfo | null;
};

function parseTermsPayload(body: unknown): TermsAgreementInfo | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as {
    code?: unknown;
    versionTag?: unknown;
    effectiveDate?: unknown;
    termsUrl?: unknown;
    terms?: unknown;
  };
  const source =
    rec.terms && typeof rec.terms === "object"
      ? (rec.terms as Record<string, unknown>)
      : rec;
  const versionTag = typeof source.versionTag === "string" ? source.versionTag : "";
  const effectiveDate =
    typeof source.effectiveDate === "string" ? source.effectiveDate : "";
  const termsUrl =
    typeof source.termsUrl === "string" && source.termsUrl.trim()
      ? source.termsUrl
      : TERMS_OF_SERVICE_REVIEW_PATH;
  if (!versionTag && !effectiveDate && rec.code !== TERMS_REQUIRED_CODE) return null;
  return {
    versionTag: versionTag || "v2.0",
    effectiveDate: effectiveDate || "2026-11-15",
    termsUrl,
  };
}

async function fetchTermsStatus(): Promise<TermsAgreementInfo | null> {
  try {
    const res = await fetch("/api/legal/terms-status", { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as TermsStatusResponse;
    if (!data.required || !data.terms) return null;
    return parseTermsPayload(data);
  } catch {
    return null;
  }
}

export function TermsAgreementProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const sessionState = useSession();
  const [terms, setTerms] = useState<TermsAgreementInfo | null>(null);
  const [accepting, setAccepting] = useState(false);
  const acceptedVersionRef = useRef<string | null>(null);
  const dbSatisfiedRef = useRef(false);

  const showModal = Boolean(terms) && !isTermsGateExemptPagePath(pathname);

  const openFromPayload = useCallback((payload: TermsAgreementInfo | null) => {
    if (!payload || dbSatisfiedRef.current) return;
    if (acceptedVersionRef.current && acceptedVersionRef.current === payload.versionTag) return;
    setTerms(payload);
  }, []);

  useEffect(() => {
    if (sessionState?.status === "unauthenticated") {
      acceptedVersionRef.current = null;
      dbSatisfiedRef.current = false;
      setTerms(null);
      return;
    }
    if (sessionState?.status === "loading") return;

    let cancelled = false;
    void (async () => {
      const next = await fetchTermsStatus();
      if (cancelled) return;
      if (!next || acceptedVersionRef.current === next.versionTag) {
        dbSatisfiedRef.current = !next || acceptedVersionRef.current === next.versionTag;
        if (!next) acceptedVersionRef.current = null;
        setTerms(null);
        return;
      }
      dbSatisfiedRef.current = false;
      setTerms(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionState?.data?.user?.id, sessionState?.status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init);
      if (res.status === 403) {
        try {
          const cloned = res.clone();
          const body: unknown = await cloned.json();
          if (
            body &&
            typeof body === "object" &&
            (body as { code?: unknown }).code === TERMS_REQUIRED_CODE
          ) {
            openFromPayload(parseTermsPayload(body));
          }
        } catch {
          /* non-JSON 403 */
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, [openFromPayload]);

  const onAccept = useCallback(async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/legal/terms-agree", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return;
      const body: unknown = await res.json().catch(() => null);
      const accepted = parseTermsPayload(body);
      if (accepted?.versionTag) acceptedVersionRef.current = accepted.versionTag;
      setTerms(null);
      await sessionState?.update?.();
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }, [router, sessionState]);

  const onDecline = useCallback(async () => {
    const { performWebSignOut } = await import("@/lib/account-switch/sign-out-client");
    await performWebSignOut({
      callbackUrl: DEFAULT_LANDING_PATH,
      userId: sessionState?.data?.user?.id,
    });
  }, [sessionState?.data?.user?.id]);

  return (
    <>
      {children}
      {terms ? (
        <TermsAgreementModal
          open={showModal}
          terms={terms}
          accepting={accepting}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ) : null}
    </>
  );
}
