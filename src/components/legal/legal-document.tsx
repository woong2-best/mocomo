import Link from "next/link";
import type { LegalDocument } from "@/lib/legal-content";
import { LEGAL_CONTACT_EMAIL, LEGAL_PAGES } from "@/lib/legal-content";

function renderBlock(block: LegalDocument["blocks"][number], key: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={key} className="text-lg font-bold mt-8 mb-3">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-base font-semibold mt-4 mb-2">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={key} className="text-sm text-muted-foreground leading-relaxed mb-3">
          {block.text.includes("@") ? (
            <>
              {block.text.split(LEGAL_CONTACT_EMAIL)[0]}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>
              {block.text.split(LEGAL_CONTACT_EMAIL)[1]}
            </>
          ) : (
            block.text
          )}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground mb-4">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "hr":
      return <hr key={key} className="border-border/60 my-6" />;
    default:
      return null;
  }
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{document.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">최종 업데이트: {document.updatedAt}</p>
        {document.intro && (
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{document.intro}</p>
        )}
      </header>

      <div>{document.blocks.map((block, i) => renderBlock(block, i))}</div>

      <footer className="mt-12 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">관련 문서</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {LEGAL_PAGES.filter((p) => p.doc.slug !== document.slug).map((p) => (
            <Link key={p.href} href={p.href} className="text-primary hover:underline">
              {p.label}
            </Link>
          ))}
        </div>
      </footer>
    </article>
  );
}
