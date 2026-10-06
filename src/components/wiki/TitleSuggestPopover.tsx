"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { normalize, type IndexedWikiTitle } from "@/lib/wiki/editorUtils";
import { cn } from "@/lib/utils";

export type PopoverPlacement = "below" | "above";

type TitleSuggestPopoverProps = {
  items: IndexedWikiTitle[];
  activeIndex: number;
  query: string;
  isSearching?: boolean;
  top: number;
  left: number;
  tailLeft: number;
  placement: PopoverPlacement;
  listId: string;
  onSelect: (item: IndexedWikiTitle) => void;
  optionRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
};

export function TitleSuggestPopover({
  items,
  activeIndex,
  query,
  isSearching,
  top,
  left,
  tailLeft,
  placement,
  listId,
  onSelect,
  optionRefs,
}: TitleSuggestPopoverProps) {
  const { t } = useLocale();
  if (items.length === 0 && !isSearching) return null;

  const normalizedQuery = normalize(query);
  const hasExact = items.some((item) => item.normalizedEnglish === normalizedQuery);
  const activeId = items[activeIndex] ? `${listId}-opt-${items[activeIndex].id}` : undefined;

  return (
    <div
      className="pointer-events-auto absolute z-50 w-80 max-w-[calc(100%-1rem)] origin-top-left transition duration-150 ease-out"
      style={{ top, left }}
      data-placement={placement}
    >
      <span
        aria-hidden
        className={cn(
          "absolute size-3 rotate-45 bg-white shadow-sm",
          placement === "below" ? "-top-1.5" : "-bottom-1.5"
        )}
        style={{ left: tailLeft }}
      />
      <div className="relative overflow-hidden rounded-lg bg-white text-black shadow-lg">
        {isSearching ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("wiki.editor.searching")}</span>
          </div>
        ) : null}
        <div
          id={listId}
          role="listbox"
          aria-activedescendant={activeId}
          className="max-h-60 overflow-y-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5"
        >
          {items.map((item, index) => {
            const exact = item.normalizedEnglish === normalizedQuery;
            return (
              <button
                key={item.id}
                id={`${listId}-opt-${item.id}`}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors duration-150",
                  "hover:bg-blue-100",
                  index === activeIndex && "bg-blue-100"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{item.english}</span>
                  <span className="block truncate text-[11px] text-slate-500">{item.original}</span>
                </span>
                {exact ? (
                  <span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {t("wiki.editor.alreadyExists")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {hasExact ? (
          <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-orange-700">
            {t("wiki.editor.duplicateEnglishTitle")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
