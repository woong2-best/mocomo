"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCaretCoordinates } from "@/lib/wiki/caret";
import { X } from "lucide-react";
import { EditorToolbar } from "@/components/wiki/EditorToolbar";
import { TitleSuggestPopover, type PopoverPlacement } from "@/components/wiki/TitleSuggestPopover";
import { useLocale } from "@/components/providers/locale-provider";
import { extractYoutubeId } from "@/lib/anime-revision";
import { DUMMY_WIKI_TITLES } from "@/lib/wiki/dummyTitles";
import {
  applyTitleSuggestion,
  detectTitleContext,
  indexWikiTitles,
  insertMacro,
  insertOrFocusToken,
  replaceRange,
  searchTitles,
  type IndexedWikiTitle,
  type TitleContext,
  type WikiTitle,
} from "@/lib/wiki/editorUtils";
import type { WikiMacro } from "@/lib/wiki/macros";
import { cn } from "@/lib/utils";

export type WikiEditorProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (markdown: string) => void;
  existingTitles?: WikiTitle[];
  onUploadImage?: (file: File, kind: "cover" | "banner") => void | Promise<void | string>;
  onUploadVideo?: (file: File) => void | Promise<void | string>;
  isSearching?: boolean;
  className?: string;
  showSubmit?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  initialCoverUrl?: string;
  initialBannerUrl?: string;
};

type PopoverState = {
  context: TitleContext;
  top: number;
  left: number;
  tailLeft: number;
  placement: PopoverPlacement;
};

type MediaPreview = {
  kind: "cover" | "banner";
  url: string;
};

const POPOVER_WIDTH = 320;
const POPOVER_EST_HEIGHT = 240;
const DEBOUNCE_MS = 80;

function scrollTextareaToCaret(textarea: HTMLTextAreaElement, pos: number) {
  const coords = getCaretCoordinates(textarea, pos);
  const padding = 24;
  if (coords.top < textarea.scrollTop) {
    textarea.scrollTop = Math.max(0, coords.top - padding);
  } else if (coords.top + coords.height > textarea.scrollTop + textarea.clientHeight) {
    textarea.scrollTop = coords.top + coords.height - textarea.clientHeight + padding;
  }
}

export function WikiEditor({
  value,
  defaultValue = "",
  onChange,
  onSubmit,
  existingTitles = DUMMY_WIKI_TITLES,
  onUploadImage,
  onUploadVideo,
  isSearching = false,
  className,
  showSubmit = false,
  submitLabel,
  submitDisabled,
  initialCoverUrl,
  initialBannerUrl,
}: WikiEditorProps) {
  const { t } = useLocale();
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const text = isControlled ? value : inner;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const composingRef = useRef(false);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const debounceTimer = useRef<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageBusy, setImageBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [previews, setPreviews] = useState<MediaPreview[]>(() => {
    const next: MediaPreview[] = [];
    if (initialCoverUrl) next.push({ kind: "cover", url: initialCoverUrl });
    if (initialBannerUrl) next.push({ kind: "banner", url: initialBannerUrl });
    return next;
  });
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const listId = useId();
  const indexedTitles = useMemo(() => indexWikiTitles(existingTitles), [existingTitles]);
  const deferredQuery = useDeferredValue(popover?.context.query ?? "");

  const results = useMemo(() => {
    if (!popover || composingRef.current) return [];
    return searchTitles(indexedTitles, deferredQuery);
  }, [indexedTitles, deferredQuery, popover]);

  const setText = useCallback(
    (next: string, caret?: number) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
      if (caret !== undefined) pendingCaretRef.current = caret;
    },
    [isControlled, onChange]
  );

  useLayoutEffect(() => {
    const pos = pendingCaretRef.current;
    const ta = textareaRef.current;
    if (pos === null || !ta) return;
    pendingCaretRef.current = null;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    scrollTextareaToCaret(ta, pos);
  }, [text]);

  const applyInsert = useCallback(
    (result: { next: string; caret: number }) => {
      setText(result.next, result.caret);
    },
    [setText]
  );

  const selection = useCallback(() => {
    const ta = textareaRef.current;
    return {
      start: ta?.selectionStart ?? text.length,
      end: ta?.selectionEnd ?? text.length,
    };
  }, [text.length]);

  const closePopover = useCallback(() => {
    setPopover(null);
    setActiveIndex(0);
  }, []);

  const evaluateContext = useCallback(() => {
    if (composingRef.current) return;
    const ta = textareaRef.current;
    const wrap = wrapperRef.current;
    if (!ta || !wrap) {
      closePopover();
      return;
    }
    const caret = ta.selectionStart ?? 0;
    const ctx = detectTitleContext(text, caret);
    if (!ctx) {
      closePopover();
      return;
    }

    const coords = getCaretCoordinates(ta, caret);
    const caretTop = coords.top - ta.scrollTop + ta.offsetTop;
    const caretLeft = coords.left - ta.scrollLeft + ta.offsetLeft;
    const lineHeight = coords.height || 18;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const popW = Math.min(POPOVER_WIDTH, wrapW - 16);

    let boxLeft = caretLeft - 16;
    if (boxLeft < 8) boxLeft = 8;
    if (boxLeft + popW > wrapW - 8) boxLeft = Math.max(8, wrapW - 8 - popW);

    let placement: PopoverPlacement = "below";
    let boxTop = caretTop + lineHeight + 10;
    if (boxTop + POPOVER_EST_HEIGHT > wrapH - 8 && caretTop > POPOVER_EST_HEIGHT) {
      placement = "above";
      boxTop = Math.max(8, caretTop - POPOVER_EST_HEIGHT - 10);
    }

    const tailLeft = Math.max(8, Math.min(caretLeft - boxLeft - 6, popW - 20));

    setPopover({
      context: ctx,
      top: boxTop,
      left: boxLeft,
      tailLeft,
      placement,
    });
    setActiveIndex(0);
  }, [closePopover, text]);

  const scheduleEvaluate = useCallback(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      evaluateContext();
    }, DEBOUNCE_MS);
  }, [evaluateContext]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    const onResize = () => evaluateContext();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [evaluateContext]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) closePopover();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [closePopover]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results]);

  const selectTitle = useCallback(
    (item: IndexedWikiTitle) => {
      if (!popover) return;
      const result = applyTitleSuggestion(text, popover.context, item.english);
      applyInsert(result);
      closePopover();
    },
    [applyInsert, closePopover, popover, text]
  );

  const handleMacro = useCallback(
    (macro: WikiMacro) => {
      const { start, end } = selection();
      applyInsert(insertMacro(text, start, end, macro));
    },
    [applyInsert, selection, text]
  );

  const insertMediaSnippet = useCallback(
    (snippet: string) => {
      const { start, end } = selection();
      applyInsert(replaceRange(text, start, end, snippet, snippet.length));
    },
    [applyInsert, selection, text]
  );

  const handleInlineImage = useCallback(
    async (file: File) => {
      setImageBusy(true);
      setMediaError("");
      try {
        const { prepareGalleryImageForUpload } = await import("@/lib/gallery-image-upload");
        const { uploadImageBlob } = await import("@/lib/client-upload");
        const prepared = await prepareGalleryImageForUpload(file);
        const url = await uploadImageBlob(prepared, prepared.name || "wiki.webp");
        const alt = file.name.replace(/\.[^.]+$/, "");
        insertMediaSnippet(`![${alt}](${url})`);
      } catch {
        setMediaError(t("wiki.editor.uploadFailed"));
      } finally {
        setImageBusy(false);
      }
    },
    [insertMediaSnippet, t]
  );

  const handleVideoFile = useCallback(
    async (file: File) => {
      if (!onUploadVideo) return;
      setVideoBusy(true);
      setMediaError("");
      try {
        const url = await onUploadVideo(file);
        if (typeof url === "string" && url.trim()) {
          const trimmed = url.trim();
          insertMediaSnippet(extractYoutubeId(trimmed) ? `${trimmed}\n` : `[Video: ${trimmed}]`);
        }
      } catch {
        setMediaError(t("wiki.editor.uploadFailed"));
      } finally {
        setVideoBusy(false);
      }
    },
    [insertMediaSnippet, onUploadVideo, t]
  );

  const handleYoutubeInsert = useCallback(() => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setMediaError(t("anime.s15oqwxv"));
      return;
    }
    if (!extractYoutubeId(trimmed)) {
      setMediaError(t("anime.s1qniagj"));
      return;
    }
    insertMediaSnippet(`${trimmed}\n`);
    setYoutubeUrl("");
    setYoutubeOpen(false);
    setMediaError("");
  }, [insertMediaSnippet, t, youtubeUrl]);

  const handleCoverOrBanner = useCallback(
    async (file: File, kind: "cover" | "banner") => {
      const token = kind === "cover" ? "[Cover Image]" : "[Banner Image]";
      const { start, end } = selection();
      applyInsert(insertOrFocusToken(text, start, end, token));

      const local = URL.createObjectURL(file);
      setPreviews((prev) => {
        const next = prev.filter((p) => p.kind !== kind);
        return [...next, { kind, url: local }];
      });

      try {
        await onUploadImage?.(file, kind);
      } catch {
        setMediaError(t("wiki.editor.uploadFailed"));
      }
    },
    [applyInsert, onUploadImage, selection, t, text]
  );

  const removePreview = useCallback((kind: "cover" | "banner") => {
    setPreviews((prev) => {
      const target = prev.find((p) => p.kind === kind);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.kind !== kind);
    });
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
      });
    };
    // Unmount-only cleanup for object URLs created during this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!popover || results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = results[activeIndex];
        if (item) selectTitle(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closePopover();
      }
    },
    [activeIndex, closePopover, popover, results, selectTitle]
  );

  const visiblePopover = popover && (results.length > 0 || isSearching) ? popover : null;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative overflow-visible rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.35)] bg-card text-card-foreground shadow-[3px_4px_0_hsl(var(--folk-cobalt)/0.12)]",
        className
      )}
    >
      <EditorToolbar
        onMacro={handleMacro}
        onPickImage={() => imageInputRef.current?.click()}
        onPickVideo={() => {
          if (onUploadVideo) videoInputRef.current?.click();
          else setYoutubeOpen((open) => !open);
        }}
        onPickCover={() => coverInputRef.current?.click()}
        onPickBanner={() => bannerInputRef.current?.click()}
        imageBusy={imageBusy}
        videoBusy={videoBusy}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleInlineImage(file);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleVideoFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleCoverOrBanner(file, "cover");
          e.target.value = "";
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleCoverOrBanner(file, "banner");
          e.target.value = "";
        }}
      />

      {youtubeOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              setMediaError("");
            }}
            placeholder={t("anime.sr7fl2u")}
            className="h-8 max-w-md flex-1 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleYoutubeInsert}
            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
          >
            {t("anime.s8h0lq5")}
          </button>
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div className="flex flex-wrap gap-3 border-b border-border/70 bg-muted/20 px-3 py-2">
          {previews.map((preview) => (
            <div key={preview.kind} className="relative">
              <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{preview.kind}</p>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border border-border/70 bg-muted/30",
                  preview.kind === "banner" ? "aspect-[3/1] w-40" : "aspect-[2/3] w-20"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
              </div>
              <button
                type="button"
                title={t("wiki.editor.removePreview")}
                aria-label={t("wiki.editor.removePreview")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => removePreview(preview.kind)}
                className="absolute -right-1 -top-1 rounded-full bg-card p-0.5 text-muted-foreground shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {mediaError ? (
        <p className="px-3 pt-2 text-xs text-destructive" role="alert">
          {mediaError}
        </p>
      ) : null}

      <textarea
        ref={textareaRef}
        value={text}
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={visiblePopover ? listId : undefined}
        aria-expanded={Boolean(visiblePopover)}
        className="min-h-[480px] w-full resize-y bg-background px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
        onChange={(e) => {
          setText(e.target.value);
          if (!composingRef.current) scheduleEvaluate();
        }}
        onKeyDown={onTextareaKeyDown}
        onKeyUp={() => {
          if (!composingRef.current) scheduleEvaluate();
        }}
        onClick={() => scheduleEvaluate()}
        onSelect={() => scheduleEvaluate()}
        onScroll={() => evaluateContext()}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          scheduleEvaluate();
        }}
      />

      {visiblePopover ? (
        <TitleSuggestPopover
          items={results}
          activeIndex={Math.min(activeIndex, Math.max(0, results.length - 1))}
          query={visiblePopover.context.query}
          isSearching={isSearching}
          top={visiblePopover.top}
          left={visiblePopover.left}
          tailLeft={visiblePopover.tailLeft}
          placement={visiblePopover.placement}
          listId={listId}
          onSelect={selectTitle}
          optionRefs={optionRefs}
        />
      ) : null}

      {showSubmit && onSubmit ? (
        <div className="border-t border-border/80 p-3">
          <button
            type="button"
            disabled={submitDisabled}
            onClick={() => onSubmit(text)}
            className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitLabel ?? t("wiki.editor.submit")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
