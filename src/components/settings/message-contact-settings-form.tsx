"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContactAudience } from "@/actions/contact-audience";
import { cn } from "@/lib/utils";

type Audience = "EVERYONE" | "FOLLOWING_ONLY";

type Settings = {
  messageRequestAudience: Audience;
  callRequestAudience: Audience;
};

function Choice({
  selected,
  title,
  description,
  disabled,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border-2 p-4 text-left transition-all",
        selected
          ? "border-folk-terracotta bg-folk-terracotta/5 shadow-folk-sm"
          : "border-border hover:border-folk-cobalt/30 hover:bg-muted/30"
      )}
    >
      <span className="font-semibold text-sm">{title}</span>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
    </button>
  );
}

export function MessageContactSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState<"message" | "call" | null>(null);
  const [error, setError] = useState("");

  async function selectMessage(next: Audience) {
    if (next === settings.messageRequestAudience || loading) return;
    setLoading("message");
    setError("");
    const result = await updateContactAudience({ messageRequestAudience: next });
    setLoading(null);
    if ("error" in result && result.error) {
      setError(errorText(result.error));
      return;
    }
    if ("settings" in result && result.settings) setSettings(result.settings);
    router.refresh();
  }

  async function selectCall(next: Audience) {
    if (next === settings.callRequestAudience || loading) return;
    setLoading("call");
    setError("");
    const result = await updateContactAudience({ callRequestAudience: next });
    setLoading(null);
    if ("error" in result && result.error) {
      setError(errorText(result.error));
      return;
    }
    if ("settings" in result && result.settings) setSettings(result.settings);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3" role="radiogroup" aria-label="Allow message requests from">
        <div>
          <h2 className="font-semibold">메시지 요청 허용 범위</h2>
          <p className="text-sm text-muted-foreground mt-1">Allow message requests from</p>
        </div>
        <Choice
          selected={settings.messageRequestAudience === "EVERYONE"}
          title="Everyone (모든 사람)"
          description="누구나 나에게 새 메시지를 보낼 수 있습니다."
          disabled={loading !== null}
          onSelect={() => void selectMessage("EVERYONE")}
        />
        <Choice
          selected={settings.messageRequestAudience === "FOLLOWING_ONLY"}
          title="No one (내가 팔로우하는 사람만)"
          description="내가 팔로우한 사람만 새 DM을 시작할 수 있습니다. 상대가 나를 팔로우해도, 내가 팔로우하지 않았다면 보낼 수 없습니다."
          disabled={loading !== null}
          onSelect={() => void selectMessage("FOLLOWING_ONLY")}
        />
      </section>

      <section className="space-y-3" role="radiogroup" aria-label="Calls">
        <div>
          <h2 className="font-semibold">통화</h2>
          <p className="text-sm text-muted-foreground mt-1">
            기본값은 On입니다. Off면 메시지와 같이, 내가 팔로우한 사람만 전화를 걸 수 있습니다.
          </p>
        </div>
        <Choice
          selected={settings.callRequestAudience === "EVERYONE"}
          title="On"
          description="모든 사람이 나에게 통화할 수 있습니다."
          disabled={loading !== null}
          onSelect={() => void selectCall("EVERYONE")}
        />
        <Choice
          selected={settings.callRequestAudience === "FOLLOWING_ONLY"}
          title="Off"
          description="내가 팔로우한 사람만 통화할 수 있습니다."
          disabled={loading !== null}
          onSelect={() => void selectCall("FOLLOWING_ONLY")}
        />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
