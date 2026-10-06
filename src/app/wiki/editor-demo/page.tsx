"use client";

import { useState } from "react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { WikiEditor } from "@/components/wiki/WikiEditor";

export default function WikiEditorDemoPage() {
  const [lastSubmit, setLastSubmit] = useState("");

  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <NativePageTitle>
        <h1 className="text-xl font-bold">Wiki editor demo</h1>
      </NativePageTitle>
      <p className="text-sm text-muted-foreground">
        Unified Culture Wiki markdown editor. Type{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">[ちいかわ (chii</code> to open
        English-title suggestions.
      </p>
      <WikiEditor
        defaultValue={"[ちいかわ (]\n{Anime}\n"}
        onSubmit={(markdown) => setLastSubmit(markdown)}
        showSubmit
        submitLabel="Preview submit"
      />
      {lastSubmit ? (
        <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
          {lastSubmit}
        </pre>
      ) : null}
    </AppPageChrome>
  );
}
