"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComposeForm } from "@/components/compose/compose-form";
import { useLocale } from "@/components/providers/locale-provider";

export function HomeLoggedBanner() {
  const router = useRouter();
  const { t } = useLocale();
  const [formKey, setFormKey] = useState(0);
  const [postedMsg, setPostedMsg] = useState(false);

  return (
    <div className="border-b border-border/60 bg-background px-4 py-3 sm:px-5 sm:py-4">
      <ComposeForm
        key={formKey}
        variant="inline"
        onPosted={() => {
          setFormKey((k) => k + 1);
          setPostedMsg(true);
          router.refresh();
          window.setTimeout(() => setPostedMsg(false), 2800);
        }}
      />
      {postedMsg && (
        <p className="text-sm text-emerald-600 font-medium mt-2 pl-[52px]">{t("feed.posted")}</p>
      )}
    </div>
  );
}
