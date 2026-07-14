"use client";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      className="rounded-lg border border-border px-3 py-1.5 text-sm print:hidden"
      onClick={() => window.print()}
    >
      인쇄 / PDF
    </button>
  );
}
