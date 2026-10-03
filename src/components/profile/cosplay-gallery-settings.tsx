"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Gem, Loader2, Trash2 } from "lucide-react";
import { addCosplayPhoto, deleteCosplayPhoto } from "@/actions/cosplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";

export type CosplayGalleryPhoto = {
  id: string;
  url: string;
  character: string | null;
  series: string | null;
};

export function CosplayGallerySettings({
  username,
  initialPhotos,
}: {
  username: string;
  initialPhotos: CosplayGalleryPhoto[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [pending, setPending] = useState<PostMediaItem[]>([]);
  const [character, setCharacter] = useState("");
  const [series, setSeries] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);

  async function handleDelete(photoId: string) {
    if (!confirm(t("profile.sgzmzw6"))) return;
    setDeletingId(photoId);
    setMsg("");
    setMsgIsError(false);
    const result = await deleteCosplayPhoto(photoId);
    setDeletingId(null);
    if ("error" in result && result.error) {
      setMsg(errorText(result.error));
      setMsgIsError(true);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    router.refresh();
  }

  async function handleAdd() {
    const url = pending[0]?.url?.trim();
    if (!url || url.startsWith("blob:")) {
      setMsg(t("lib.cosplayer.apply.se1e84d6f4b"));
      setMsgIsError(true);
      return;
    }

    setUploading(true);
    setMsg("");
    setMsgIsError(false);
    const result = await addCosplayPhoto({
      url,
      character: character.trim() || undefined,
      series: series.trim() || undefined,
    });
    setUploading(false);

    if ("error" in result && result.error) {
      setMsg(errorText(result.error));
      setMsgIsError(true);
      return;
    }
    if (result.photo) {
      setPhotos((prev) => [result.photo!, ...prev]);
      setPending([]);
      setCharacter("");
      setSeries("");
      setMsg(t("profile.s1rudonx"));
      router.refresh();
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-pink-500" />
          {t("profile.sb9u3dk")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("profile.galleryHintStart")}
          <Link href={`/cosplay/${username}`} className="text-primary hover:underline">
            {t("profile.cosplayProfile")}
          </Link>
          .
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.character || t("profile.s1erwyck")}
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  {photo.character && (
                    <p className="text-xs font-medium text-white truncate">{photo.character}</p>
                  )}
                  {photo.series && (
                    <p className="text-[10px] text-white/80 truncate">{photo.series}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-90"
                  disabled={deletingId === photo.id}
                  onClick={() => handleDelete(photo.id)}
                  aria-label={t("profile.s1wib4wn")}
                >
                  {deletingId === photo.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-4 text-center">
            {t("profile.s1wmdh86")}
          </p>
        )}

        <div className="rounded-xl border border-border/60 p-4 space-y-4 bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4 text-pink-500" />
            {t("profile.s1wid6d0")}
          </div>
          <PostMediaComposer
            items={pending}
            onChange={setPending}
            maxImages={1}
            maxVideos={0}
            allowVideo={false}
            quickUpload
            disabled={uploading}
            onUploadingChange={setUploading}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              placeholder={t("profile.s1gcuey9")}
              className="rounded-xl"
              disabled={uploading}
            />
            <Input
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder={t("profile.s1uud5yu")}
              className="rounded-xl"
              disabled={uploading}
            />
          </div>
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={uploading || pending.length === 0}
            onClick={handleAdd}
          >
            {uploading ? t("profile.s1de9myg") : t("profile.s12wq4kg")}
          </Button>
        </div>

        {msg && (
          <p className={`text-sm ${msgIsError ? "text-destructive" : "text-primary"}`}>
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
