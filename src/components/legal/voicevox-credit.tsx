import { VOICEVOX_NO7_CREDIT } from "@/lib/ai-live/voicevox-credit";
import { cn } from "@/lib/utils";

/** Required VOICEVOX No.7 source line. Keep the wording exact. */
export function VoicevoxCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] leading-none tracking-wide text-muted-foreground/75", className)}>
      {VOICEVOX_NO7_CREDIT}
    </p>
  );
}
