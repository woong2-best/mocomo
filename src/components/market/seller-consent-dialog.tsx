"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SELLER_MARKETING_CONSENT,
  SELLER_PRIVACY_GUIDE,
  SELLER_TERMS,
} from "@/lib/marketplace/seller-legal";
import { LegalDocumentView } from "@/components/legal/legal-document";

type ConsentKind = "terms" | "marketing" | "privacy";

const COPY = {
  marketing: SELLER_MARKETING_CONSENT,
  privacy: SELLER_PRIVACY_GUIDE,
} as const;

export function SellerConsentDialog({
  open,
  kind,
  onOpenChange,
}: {
  open: boolean;
  kind: ConsentKind | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!kind) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {kind === "terms" ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{SELLER_TERMS.title}</DialogTitle>
            </DialogHeader>
            <div className="[&_header]:mb-4">
              <LegalDocumentView document={SELLER_TERMS} />
            </div>
          </>
        ) : (
          <ConsentTableBody kind={kind} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConsentTableBody({ kind }: { kind: "marketing" | "privacy" }) {
  const doc = COPY[kind];
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-left text-lg">{doc.title}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">{doc.intro}</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-muted/50">
            <tr>
              {"purpose" in doc.columns && kind === "privacy" ? (
                <>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.purpose}</th>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.items}</th>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.retention}</th>
                </>
              ) : (
                <>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.items}</th>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.purpose}</th>
                  <th className="p-2.5 font-semibold border-b">{doc.columns.retention}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((row) => (
              <tr key={row.items + row.purpose} className="align-top">
                {kind === "privacy" ? (
                  <>
                    <td className="p-2.5 border-b border-border/60">{row.purpose}</td>
                    <td className="p-2.5 border-b border-border/60">{row.items}</td>
                    <td className="p-2.5 border-b border-border/60">{row.retention}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2.5 border-b border-border/60">{row.items}</td>
                    <td className="p-2.5 border-b border-border/60">{row.purpose}</td>
                    <td className="p-2.5 border-b border-border/60">{row.retention}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {doc.footnotes.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </>
  );
}
