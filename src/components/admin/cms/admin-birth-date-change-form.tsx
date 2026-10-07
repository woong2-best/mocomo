"use client";

import { useState, useTransition } from "react";
import { adminChangeBirthDateAction } from "@/actions/admin-cms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/i18n/error-text";

export function AdminBirthDateChangeForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <form
      className="mt-4 space-y-2 rounded-xl border border-border/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const reason = String(form.get("reason") ?? "").trim();
        if (!reason) {
          setMsg("A reason is required.");
          return;
        }
        startTransition(async () => {
          const res = await adminChangeBirthDateAction({
            userId,
            birthYear: Number(form.get("birthYear")),
            birthMonth: Number(form.get("birthMonth")),
            birthDay: Number(form.get("birthDay")),
            reason,
          });
          setMsg(res.ok ? "Updated." : errorText(res.error));
        });
      }}
    >
      <p className="text-xs font-medium text-muted-foreground">Admin change (reason required)</p>
      <div className="grid grid-cols-3 gap-2">
        <Input name="birthYear" placeholder="YYYY" inputMode="numeric" required />
        <Input name="birthMonth" placeholder="MM" inputMode="numeric" required />
        <Input name="birthDay" placeholder="DD" inputMode="numeric" required />
      </div>
      <Input name="reason" placeholder="Reason" required />
      <Button type="submit" disabled={pending} size="sm">
        Save date of birth
      </Button>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
