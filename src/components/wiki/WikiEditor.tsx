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
import { Play, X } from "lucide-react";
import { EditorToolbar } from "@/components/wiki/EditorToolbar";
import { TitleSuggestPopover, type PopoverPlacement } from "@/components/wiki/TitleSuggestPopover";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");
import { extractYoutubeId } from "@/lib/anime-revision";
import { DUMMY_WIKI_TITLES } from "@/lib/wiki/dummyTitles";
import {
  applyTitleSuggestion,
  detectTitleContext,
  indexWikiTitles,
  insertMacro,
  insertOrFocusToken,
  searchTitles,
  type IndexedWikiTitle,
  type TitleContext,
  type WikiTitle,
} from "@/lib/wiki/editorUtils";
import type { WikiMacro } from "@/lib/wiki/macros";
import {
  insertWikiEditorMediaInPart,
  removeWikiEditorPart,
  replaceWikiEditorPartText,
  splitWikiEditorParts,
  type WikiEditorMedia,
} from "@/lib/wiki/media";
import { cn } from "@/lib/utils";
import { FileDropZone } from "@/components/media/file-drop-zone";
import { isGalleryImageFile } from "@/lib/gallery-image-upload";
import { isGalleryVideoFile } from "@/lib/gallery-video-upload";

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
  /** `body` keeps image/video + [[title]] suggest; meta macros stay on the structured form. */
  variant?: "document" | "body";
  placeholder?: string;
  /** Fetch live wiki titles while typing `[[`. */
  liveTitles?: boolean;
  /** Open the structured Article info editor instead of inserting raw infobox markup. */
  onInfobox?: () => void;
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
  existingTitles,
  liveTitles = true,
  onUploadImage,
  onUploadVideo,
  isSearching = false,
  className,
  showSubmit = false,
  submitLabel,
  submitDisabled,
  initialCoverUrl,
  initialBannerUrl,
  variant = "document",
  placeholder,
  onInfobox,
}: WikiEditorProps) {
  const bodyOnly = variant === "body";
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const text = isControlled ? value : inner;
  const parts = useMemo(() => splitWikiEditorParts(text), [text]);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusedPartRef = useRef(0);
  const caretStartRef = useRef(0);
  const caretEndRef = useRef(0);
  const hasCaretRef = useRef(false);
  const pendingCaretRef = useRef<{ partIndex: number; pos: number } | null>(null);
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
  const [remoteTitles, setRemoteTitles] = useState<WikiTitle[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const catalogTitles = existingTitles ?? (liveTitles ? remoteTitles : DUMMY_WIKI_TITLES);
  const mergedTitles = useMemo(() => {
    const seen = new Set<string>();
    const rows: WikiTitle[] = [];
    for (const row of [...remoteTitles, ...catalogTitles]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    return rows;
  }, [catalogTitles, remoteTitles]);
  const indexedTitles = useMemo(() => indexWikiTitles(mergedTitles), [mergedTitles]);
  const deferredQuery = useDeferredValue(popover?.context.query ?? "");

  const results = useMemo(() => {
    if (!popover || composingRef.current) return [];
    return searchTitles(indexedTitles, deferredQuery);
  }, [indexedTitles, deferredQuery, popover]);

  const popoverQuery = popover?.context.query ?? "";
  const popoverKind = popover?.context.kind;

  useEffect(() => {
    if (!liveTitles || popoverKind == null) return;
    const query = popoverQuery.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLiveSearching(true);
      void fetch(`/api/anime/search?titles=1&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data: { results?: Array<{ slug: string; title: string; titleEn: string | null }> }) => {
          setRemoteTitles(
            (data.results ?? []).map((row) => ({
              id: row.slug,
              original: row.title,
              english: row.titleEn?.trim() || row.title,
            }))
          );
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteTitles([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLiveSearching(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [liveTitles, popoverKind, popoverQuery]);

  const setText = useCallback(
    (next: string, caret?: { partIndex: number; pos: number }) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
      if (caret) pendingCaretRef.current = caret;
    },
    [isControlled, onChange]
  );

  const rememberCaret = useCallback((partIndex?: number) => {
    const index = partIndex ?? focusedPartRef.current;
    const ta = textareaRefs.current[index];
    focusedPartRef.current = index;
    hasCaretRef.current = true;
    if (!ta) return;
    caretStartRef.current = ta.selectionStart ?? ta.value.length;
    caretEndRef.current = ta.selectionEnd ?? caretStartRef.current;
  }, []);

  const caretForInsert = useCallback(() => {
    if (hasCaretRef.current) {
      rememberCaret();
      return;
    }
    let lastText = 0;
    parts.forEach((part, index) => {
      if (part.type === "text") lastText = index;
    });
    focusedPartRef.current = lastText;
    const part = parts[lastText];
    const len = part?.type === "text" ? part.value.length : 0;
    caretStartRef.current = len;
    caretEndRef.current = len;
  }, [parts, rememberCaret]);

  useLayoutEffect(() => {
    textareaRefs.current.forEach((ta) => {
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.max(ta.scrollHeight, 24)}px`;
    });
    const pending = pendingCaretRef.current;
    if (!pending) return;
    const ta = textareaRefs.current[pending.partIndex];
    pendingCaretRef.current = null;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(pending.pos, pending.pos);
    scrollTextareaToCaret(ta, pending.pos);
  }, [parts]);

  const applyPartText = useCallback(
    (partIndex: number, nextValue: string, caret?: number) => {
      setText(
        replaceWikiEditorPartText(text, partIndex, nextValue),
        caret === undefined ? undefined : { partIndex, pos: caret }
      );
    },
    [setText, text]
  );

  const closePopover = useCallback(() => {
    setPopover(null);
    setActiveIndex(0);
  }, []);

  const evaluateContext = useCallback(() => {
    if (composingRef.current) return;
    const ta = textareaRefs.current[focusedPartRef.current];
    const wrap = wrapperRef.current;
    const part = parts[focusedPartRef.current];
    if (!ta || !wrap || part?.type !== "text") {
      closePopover();
      return;
    }
    const caret = ta.selectionStart ?? 0;
    const ctx = detectTitleContext(part.value, caret);
    if (!ctx) {
      closePopover();
      return;
    }

    const coords = getCaretCoordinates(ta, caret);
    const taRect = ta.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const caretTop = coords.top - ta.scrollTop + (taRect.top - wrapRect.top);
    const caretLeft = coords.left - ta.scrollLeft + (taRect.left - wrapRect.left);
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
  }, [closePopover, parts]);

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
      const label = popover.context.kind === "wikilink" ? item.english || item.original : item.english;
      const partIndex = focusedPartRef.current;
      const part = parts[partIndex];
      if (part?.type !== "text") return;
      const result = applyTitleSuggestion(part.value, popover.context, label);
      applyPartText(partIndex, result.next, result.caret);
      closePopover();
    },
    [applyPartText, closePopover, parts, popover]
  );

  const createWikiLink = useCallback(
    (query: string) => {
      if (!popover) return;
      const partIndex = focusedPartRef.current;
      const part = parts[partIndex];
      if (part?.type !== "text") return;
      const result = applyTitleSuggestion(part.value, popover.context, query.trim());
      applyPartText(partIndex, result.next, result.caret);
      closePopover();
    },
    [applyPartText, closePopover, parts, popover]
  );

  const handleMacro = useCallback(
    (macro: WikiMacro) => {
      rememberCaret();
      const partIndex = focusedPartRef.current;
      const part = parts[partIndex];
      if (part?.type !== "text") return;
      const result = insertMacro(part.value, caretStartRef.current, caretEndRef.current, macro);
      applyPartText(partIndex, result.next, result.caret);
    },
    [applyPartText, parts, rememberCaret]
  );

  const insertMediaSnippet = useCallback(
    (snippet: string) => {
      const partIndex = focusedPartRef.current;
      setText(
        insertWikiEditorMediaInPart(
          text,
          partIndex,
          caretStartRef.current,
          caretEndRef.current,
          snippet
        ),
        { partIndex: partIndex + 2, pos: 0 }
      );
    },
    [setText, text]
  );

  const removeMediaPart = useCallback(
    (partIndex: number) => {
      const previous = parts[partIndex - 1];
      setText(removeWikiEditorPart(text, partIndex), {
        partIndex: Math.max(0, partIndex - 1),
        pos: previous?.type === "text" ? previous.value.length : 0,
      });
    },
    [parts, setText, text]
  );

  const handleInlineImage = useCallback(
    async (file: File) => {
      setImageBusy(true);
      setMediaError("");
      try {
        const { prepareWikiImageForUpload } = await import("@/lib/gallery-image-upload");
        const { uploadImageBlob } = await import("@/lib/client-upload");
        const prepared = await prepareWikiImageForUpload(file);
        const url = await uploadImageBlob(prepared, prepared.name || "wiki.webp");
        insertMediaSnippet(`![image](${url})`);
      } catch {
        setMediaError(t("wiki.editor.uploadFailed"));
      } finally {
        setImageBusy(false);
      }
    },
    [insertMediaSnippet]
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
    caretForInsert();
    insertMediaSnippet(`${trimmed}\n`);
    setYoutubeUrl("");
    setYoutubeOpen(false);
    setMediaError("");
  }, [caretForInsert, insertMediaSnippet, t, youtubeUrl]);

  const handleCoverOrBanner = useCallback(
    async (file: File, kind: "cover" | "banner") => {
      const token = kind === "cover" ? "[Cover Image]" : "[Banner Image]";
      caretForInsert();
      const partIndex = focusedPartRef.current;
      const part = parts[partIndex];
      if (part?.type === "text") {
        const result = insertOrFocusToken(part.value, caretStartRef.current, caretEndRef.current, token);
        applyPartText(partIndex, result.next, result.caret);
      }

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
    [applyPartText, caretForInsert, onUploadImage, parts, t]
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

  const visiblePopover =
    popover &&
    (results.length > 0 ||
      isSearching ||
      liveSearching ||
      (popover.context.kind === "wikilink" && popover.context.query.trim().length > 0))
      ? popover
      : null;

  return (
    <FileDropZone
      ref={wrapperRef}
      className={cn(
        "relative overflow-visible rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.35)] bg-card text-card-foreground shadow-[3px_4px_0_hsl(var(--folk-cobalt)/0.12)]",
        className
      )}
      disabled={imageBusy || videoBusy}
      hint={t("media.dropHint")}
      onFiles={(files) => {
        caretForInsert();
        const image = files.find((file) => isGalleryImageFile(file, true));
        if (image) {
          void handleInlineImage(image);
          return;
        }
        const video = files.find((file) => isGalleryVideoFile(file));
        if (video) void handleVideoFile(video);
      }}
    >
      <EditorToolbar
        variant={variant}
        onMacro={handleMacro}
        onInfobox={onInfobox}
        onPickImage={() => {
          caretForInsert();
          imageInputRef.current?.click();
        }}
        onPickVideo={() => {
          caretForInsert();
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
      {bodyOnly ? null : (
        <>
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
        </>
      )}

      {youtubeOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              setMediaError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleYoutubeInsert();
              }
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

      {!bodyOnly && previews.length > 0 ? (
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

      <div
        className={cn(
          "flex w-full flex-col bg-background px-4 py-3",
          bodyOnly ? "min-h-[520px]" : "min-h-[480px]"
        )}
      >
        {parts.map((part, index) =>
          part.type === "text" ? (
            <textarea
              key={`text-${index}`}
              ref={(el) => {
                textareaRefs.current[index] = el;
              }}
              value={part.value}
              spellCheck={false}
              aria-autocomplete="list"
              aria-controls={visiblePopover && focusedPartRef.current === index ? listId : undefined}
              aria-expanded={visiblePopover && focusedPartRef.current === index ? true : undefined}
              placeholder={index === 0 && parts.length === 1 ? placeholder : undefined}
              rows={1}
              className={cn(
                "w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-foreground outline-none",
                "focus:ring-0",
                parts.length === 1
                  ? bodyOnly
                    ? "min-h-[496px]"
                    : "min-h-[456px]"
                  : part.value
                    ? "min-h-[1.5rem]"
                    : "min-h-6"
              )}
              onFocus={() => {
                focusedPartRef.current = index;
                rememberCaret(index);
              }}
              onChange={(e) => {
                applyPartText(index, e.target.value);
                if (!composingRef.current) scheduleEvaluate();
              }}
              onKeyDown={onTextareaKeyDown}
              onKeyUp={() => {
                rememberCaret(index);
                if (!composingRef.current) scheduleEvaluate();
              }}
              onClick={() => {
                rememberCaret(index);
                scheduleEvaluate();
              }}
              onSelect={() => {
                rememberCaret(index);
                scheduleEvaluate();
              }}
              onScroll={() => evaluateContext()}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={() => {
                composingRef.current = false;
                rememberCaret(index);
                scheduleEvaluate();
              }}
            />
          ) : (
            <WikiEditorInlineMedia
              key={`media-${index}-${part.item.snippet}`}
              item={part.item}
              onRemove={() => removeMediaPart(index)}
            />
          )
        )}
      </div>

      {visiblePopover ? (
        <TitleSuggestPopover
          items={results}
          activeIndex={Math.min(activeIndex, Math.max(0, results.length - 1))}
          query={visiblePopover.context.query}
          isSearching={isSearching || liveSearching}
          mode={visiblePopover.context.kind === "wikilink" ? "wikilink" : "title"}
          onCreate={createWikiLink}
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
    </FileDropZone>
  );
}

function WikiEditorInlineMedia({
  item,
  onRemove,
}: {
  item: WikiEditorMedia;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "relative my-2 w-fit max-w-full self-start overflow-hidden rounded-xl border border-border/70",
        item.kind === "video" ? "w-[min(100%,320px)] bg-black" : "bg-muted/40"
      )}
    >
      {item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt=""
          className="block h-auto max-h-40 w-auto max-w-[280px] object-contain"
        />
      ) : (
        <>
          {item.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" className="aspect-video w-full object-cover opacity-90" />
          ) : (
            <span className="block aspect-video w-full bg-gradient-to-br from-zinc-800 to-black" />
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </span>
        </>
      )}
      <button
        type="button"
        title={t("wiki.editor.removePreview")}
        aria-label={t("wiki.editor.removePreview")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-white shadow"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
