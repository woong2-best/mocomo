"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminStepUpDialog } from "@/components/admin/admin-step-up-dialog";
import {
  adminCancelScheduledLegalDocument,
  adminPublishLegalDocument,
} from "@/actions/admin-legal";
import { errorText } from "@/lib/i18n/error-text";
import type { LegalEditorPayload } from "@/lib/legal/legal-document-store";

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export function AdminLegalEditor({ initial }: { initial: LegalEditorPayload }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [bodyText, setBodyText] = useState(initial.bodyText);
  const [scheduledPublishAt, setScheduledPublishAt] = useState(initial.scheduledPublishAt);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  function publish(mode: "immediate" | "schedule30") {
    start(async () => {
      setMsg("");
      const res = await adminPublishLegalDocument({
        slug: initial.slug,
        title,
        intro,
        bodyText,
        mode,
      });
      if (!res.ok) {
        if (res.error === "ADMIN_STEPUP_REQUIRED") {
          retryRef.current = () => publish(mode);
          setStepUpOpen(true);
          return;
        }
        setMsg(errorText(res.error));
        return;
      }
      setScheduledPublishAt(res.scheduledPublishAt);
      setMsg(
        mode === "immediate"
          ? "Published immediately. The public page now shows this text."
          : `Announced. This text goes live on ${formatWhen(res.scheduledPublishAt)}, and the forced Terms popup will appear then.`
      );
      router.refresh();
    });
  }

  function cancelSchedule() {
    start(async () => {
      const res = await adminCancelScheduledLegalDocument(initial.slug);
      if (!res.ok) {
        if (res.error === "ADMIN_STEPUP_REQUIRED") {
          retryRef.current = cancelSchedule;
          setStepUpOpen(true);
          return;
        }
        setMsg(errorText(res.error));
        return;
      }
      setScheduledPublishAt(null);
      setMsg("Scheduled update canceled.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" disabled={pending} onClick={() => publish("immediate")}>
          Publish immediately
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => publish("schedule30")}
        >
          Announce and apply in 30 days
        </Button>
        {scheduledPublishAt ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={cancelSchedule}>
            Cancel scheduled update
          </Button>
        ) : null}
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {scheduledPublishAt ? (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm">
          Scheduled live date: {formatWhen(scheduledPublishAt)}. On that date the new text
          publishes and users must accept updated Terms.
        </p>
      ) : null}

      <label className="block space-y-1 text-sm">
        <span>Title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Intro</span>
        <Textarea
          className="min-h-[88px]"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Body (type here — use ## heading, ### subheading, - list, --- divider)</span>
        <Textarea
          className="min-h-[28rem] font-mono text-[13px] leading-relaxed"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />
      </label>
      <AdminStepUpDialog
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onVerified={() => retryRef.current?.()}
      />
    </div>
  );
}
