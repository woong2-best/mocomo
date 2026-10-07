"use client";

import { MOCO_TRANSFER_CONFIRM_BODY, MOCO_TRANSFER_CONFIRM_CHECKBOX } from "@/lib/legal/moco-transfer-consent";

type Props = {
  open: boolean;
  pending?: boolean;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MocoTransferConfirmModal({
  open,
  pending,
  accepted,
  onAcceptedChange,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <p className="text-sm leading-relaxed text-foreground">{MOCO_TRANSFER_CONFIRM_BODY}</p>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>{MOCO_TRANSFER_CONFIRM_CHECKBOX}</span>
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!accepted || pending}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
