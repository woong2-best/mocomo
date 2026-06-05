"use client";

import { sanitizeWorkTitleInput } from "@/lib/used-catalog";

export function UsedWorkTitleField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="used-work-title" className="text-sm font-medium">
        작품명 (애니/게임/IP)
      </label>
      <input
        id="used-work-title"
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(sanitizeWorkTitleInput(e.target.value))}
        placeholder="블루아카이브 (띄어쓰기 없이)"
        className="w-full h-11 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        autoComplete="off"
        spellCheck={false}
      />
      <p className="text-[10px] text-muted-foreground">예: 원신, 홀로라이브, 귀멸의칼날</p>
    </div>
  );
}
