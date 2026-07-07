"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageEditorDialog } from "@/components/media/editor/image-editor-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { avatarShapeClass } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export type ProfileImageFieldKind = "avatar" | "banner";

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
    label: "프로필 사진",
    aspect: 1,
    maxWidth: 512,
    maxHeight: 512,
    uploadFilename: "profile-avatar.jpg",
    cropTitle: "프로필 사진 자르기",
    cropDescription: "드래그·확대·90° 회전·뒤집기·자유 각도로 맞춘 뒤 적용하세요.",
  },
  banner: {
    label: "배너 이미지",
    aspect: 3,
    maxWidth: 1500,
    maxHeight: 500,
    uploadFilename: "profile-banner.jpg",
    cropTitle: "배너 자르기",
    cropDescription: "가로 3:1 영역에 맞게 드래그·확대·회전·뒤집기 후 적용하세요.",
  },
};

type ProfileImageFieldProps = {
  kind: ProfileImageFieldKind;
  name: string;
  value: string;
  onChange: (url: string) => void;
  previewClassName?: string;
};

export function ProfileImageField({ kind, name, value, onChange, previewClassName }: ProfileImageFieldProps) {
  const cfg = CONFIG[kind];
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ACCEPT.split(",");
    if (!allowed.includes(file.type)) return;
    setPicking(true);
    try {
      const src = await readFileAsObjectUrl(file);
      setCropSrc(src);
      setCropOpen(true);
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{cfg.label}</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-8 rounded-lg"
          onClick={() => setShowUrl((v) => !v)}
        >
          <Link2 className="h-3.5 w-3.5 mr-1" />
          {showUrl ? "URL 숨기기" : "URL로 입력"}
        </Button>
      </div>

      {kind === "banner" ? (
        <div
          className={cn(
            "relative h-32 sm:h-36 rounded-xl overflow-hidden border border-border bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-cyan-500/20",
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
              <img src={value} alt="" className="h-full w-full object-cover" />
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
          사진 올리기
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => onChange("")}>
            제거
          </Button>
        )}
      </div>

      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />

      {showUrl && (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... 또는 /uploads/..."
          className="rounded-xl text-sm"
        />
      )}

      {cropSrc && (
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
      )}
    </div>
  );
}
