import { MOCO_PURCHASE_SUPPORT_EMAIL } from "@/lib/legal/moco-purchase-consent";

type Props = {
  className?: string;
};

export function MocoPurchaseSupportNote({ className }: Props) {
  return (
    <p className={className ?? "text-[11px] text-muted-foreground"}>
      Questions about purchases?{" "}
      <a href={`mailto:${MOCO_PURCHASE_SUPPORT_EMAIL}`} className="font-semibold text-primary underline">
        {MOCO_PURCHASE_SUPPORT_EMAIL}
      </a>
    </p>
  );
}
