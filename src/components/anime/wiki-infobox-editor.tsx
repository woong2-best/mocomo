"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_WIKI_INFOBOX_TITLE,
  infoboxSectionsFromSource,
  serializeWikiInfobox,
  type WikiInfoboxSection,
} from "@/lib/anime-wiki-infobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

type EditorRow = { id: string; label: string; value: string };
type EditorSection = { id: string; title: string; rows: EditorRow[] };

let infoboxSeq = 0;
function nextId(prefix: string) {
  infoboxSeq += 1;
  return `${prefix}-${infoboxSeq}`;
}

function toEditorSections(source: string): EditorSection[] {
  return infoboxSectionsFromSource(source).map((section) => ({
    id: nextId("sec"),
    title: section.title,
    rows:
      section.rows.length > 0
        ? section.rows.map((row) => ({ id: nextId("row"), label: row.label, value: row.value }))
        : [{ id: nextId("row"), label: "Studio", value: "" }],
  }));
}

function toSource(sections: EditorSection[]): string {
  const payload: WikiInfoboxSection[] = sections.map((section) => ({
    title: section.title,
    rows: section.rows.map((row) => ({ label: row.label, value: row.value })),
  }));
  return serializeWikiInfobox(payload);
}

export function WikiInfoboxEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [sections, setSections] = useState(() => toEditorSections(value));

  function commit(next: EditorSection[]) {
    setSections(next);
    onChange(toSource(next));
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={section.id} className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={section.title}
              onChange={(e) => {
                const next = sections.map((item) =>
                  item.id === section.id ? { ...item, title: e.target.value } : item
                );
                commit(next);
              }}
              placeholder={t("wiki.infobox.sectionTitle")}
              className="h-8 rounded-lg text-sm font-semibold"
            />
            {sections.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-muted-foreground"
                onClick={() => commit(sections.filter((item) => item.id !== section.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">{t("wiki.infobox.removeSection")}</span>
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            {section.rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] gap-1.5">
                <Input
                  value={row.label}
                  onChange={(e) => {
                    const next = sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : {
                            ...item,
                            rows: item.rows.map((current) =>
                              current.id === row.id ? { ...current, label: e.target.value } : current
                            ),
                          }
                    );
                    commit(next);
                  }}
                  placeholder={t("wiki.infobox.labelPh")}
                  className="h-8 rounded-lg text-xs"
                />
                <Input
                  value={row.value}
                  onChange={(e) => {
                    const next = sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : {
                            ...item,
                            rows: item.rows.map((current) =>
                              current.id === row.id ? { ...current, value: e.target.value } : current
                            ),
                          }
                    );
                    commit(next);
                  }}
                  placeholder={t("wiki.infobox.valuePh")}
                  className="h-8 rounded-lg text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={() => {
                    const next = sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : { ...item, rows: item.rows.filter((current) => current.id !== row.id) }
                    );
                    commit(next);
                  }}
                  disabled={section.rows.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">{t("wiki.infobox.removeRow")}</span>
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-lg"
            onClick={() => {
              const next = sections.map((item, index) =>
                index !== si
                  ? item
                  : { ...item, rows: [...item.rows, { id: nextId("row"), label: "", value: "" }] }
              );
              commit(next);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("wiki.infobox.addRow")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 rounded-lg"
        onClick={() =>
          commit([
            ...sections,
            {
              id: nextId("sec"),
              title: DEFAULT_WIKI_INFOBOX_TITLE,
              rows: [{ id: nextId("row"), label: "", value: "" }],
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {t("wiki.infobox.addSection")}
      </Button>
    </div>
  );
}
