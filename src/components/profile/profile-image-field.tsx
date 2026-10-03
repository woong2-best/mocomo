"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageEditorDialog } from "@/components/media/editor/image-editor-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { uploadImageBlob } from "@/lib/client-upload";
import { avatarShapeClass } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export type ProfileImageFieldKind = "avatar" | "banner" | "cover";

const CONFIG: Record<
  ProfileImageFieldKind,
  {
    label: string;
    aspect: number;
    maxWidth: number;
    maxHeight: number;
    uploadFilename: string;
    cropTitle: string;
    cropDescription: string;
  }
> = {
  avatar: {
    label: t("profile.s1oj6bw"),
    aspect: 1,
    maxWidth: 512,
    maxHeight: 512,
    uploadFilename: "profile-avatar.jpg",
    cropTitle: t("profile.s1og4tq0"),
    cropDescription: t("profile.syrh4so"),
  },
  banner: {
    label: t("profile.s1qwzit0"),
    aspect: 3,
    maxWidth: 1500,
    maxHeight: 500,
    uploadFilename: "profile-banner.jpg",
    cropTitle: t("profile.s1qwzipw"),
    cropDescription: t("profile.3_1"),
  },
  cover: {
    label: t("profile.s1j4rpxo"),
    aspect: 4 / 3,
    maxWidth: 960,
    maxHeight: 720,
    uploadFilename: "community-cover.jpg",
    cropTitle: t("profile.s1rkwzd0"),
    cropDescription: t("profile.4_3"),
  },
};

type ProfileImageFieldProps = {
  kind: ProfileImageFieldKind;
  name: string;
  value: string;
  onChange: (url: string) => void;
  previewClassName?: string;
  /** Signup: file upload only — no crop editor or URL field. */
  uploadOnly?: boolean;
};

export function ProfileImageField({
  kind,
  name,
  value,
  onChange,
  previewClassName,
  uploadOnly = false,
}: ProfileImageFieldProps) {
  const cfg = CONFIG[kind];
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ACCEPT.split(",");
    if (!allowed.includes(file.type)) {
      setUploadError(t("profile.jpeg_png_webp_gif"));
      return;
    }
    setPicking(true);
    setUploadError("");
    try {
      if (uploadOnly) {
        const url = await uploadImageBlob(file, cfg.uploadFilename);
        onChange(url);
        return;
      }
      const src = await readFileAsObjectUrl(file);
      setCropSrc(src);
      setCropOpen(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("profile.sfe0ez0"));
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      <label className="text-sm font-medium">{cfg.label}</label>

      {kind === "banner" || kind === "cover" ? (
        <div
          className={cn(
            "relative overflow-hidden border border-border bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-cyan-500/20",
            kind === "banner" ? "h-32 sm:h-36 rounded-xl" : "aspect-[4/3] w-full max-w-xs rounded-xl",
            previewClassName
          )}
          style={
            value
              ? { backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
      ) : (
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-20 w-20 overflow-hidden ring-2 ring-border bg-muted flex items-center justify-center shrink-0",
              avatarShapeClass,
              previewClassName
            )}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl text-muted-foreground">?</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          disabled={picking}
          onClick={() => fileRef.current?.click()}
        >
          {picking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploadOnly ? t("lib.community-server.s979e1h") : t("profile.s1rw344o")}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => onChange("")}>
            {t("profile.remove")}
          </Button>
        )}
      </div>

      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />

      {uploadError ? (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1.5">{uploadError}</p>
      ) : null}

      {!uploadOnly && cropSrc ? (
        <ImageEditorDialog
          open={cropOpen}
          onOpenChange={(o) => {
            setCropOpen(o);
            if (!o) setCropSrc(null);
          }}
          imageSrc={cropSrc}
          aspect={cfg.aspect}
          lockAspect
          title={cfg.cropTitle}
          description={cfg.cropDescription}
          maxWidth={cfg.maxWidth}
          maxHeight={cfg.maxHeight}
          uploadFilename={cfg.uploadFilename}
          onComplete={(url) => {
            onChange(url);
            setCropSrc(null);
          }}
        />
      ) : null}
    </div>
  );
}
