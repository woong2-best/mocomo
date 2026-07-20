"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComposeForm } from "@/components/compose/compose-form";

export function HomeLoggedBanner() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="border-b border-border/60 bg-background px-4 py-3 sm:px-5 sm:py-4">
      <ComposeForm
        key={formKey}
        variant="inline"
        onPosted={() => {
          setFormKey((k) => k + 1);
          router.refresh();
        }}
      />
    </div>
  );
}
