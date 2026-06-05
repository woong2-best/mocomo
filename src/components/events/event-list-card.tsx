import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventJoinButton } from "@/components/events/event-join-button";
import { EVENT_TYPES } from "@/lib/event-registration";

type EventRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  imageUrl: string | null;
  images: unknown;
  prize: string | null;
  linkUrl: string | null;
  links: unknown;
  videoUrl: string | null;
  _count: { participants: number };
  createdBy?: { username: string; name: string | null } | null;
};

function typeLabel(type: string) {
  return EVENT_TYPES.find((t) => t.id === type)?.label ?? type;
}

function parseLinks(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { label?: string; url?: string } => !!x && typeof x === "object")
    .map((x) => ({ label: x.label?.trim() || "링크", url: x.url?.trim() || "" }))
    .filter((x) => x.url.length > 0);
}

function parseImages(raw: unknown, cover: string | null): string[] {
  const fromJson = Array.isArray(raw)
    ? raw.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  if (cover && !fromJson.includes(cover)) return [cover, ...fromJson];
  return fromJson.length > 0 ? fromJson : cover ? [cover] : [];
}

export function EventListCard({
  event,
  showJoin,
}: {
  event: EventRow;
  showJoin: boolean;
}) {
  const images = parseImages(event.images, event.imageUrl);
  const links = parseLinks(event.links);
  const allLinks = [
    ...(event.linkUrl ? [{ label: "공식 링크", url: event.linkUrl }] : []),
    ...links.filter((l) => l.url !== event.linkUrl),
  ];

  return (
    <Card className="rounded-2xl overflow-hidden">
      {images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0]}
          alt=""
          className="w-full max-h-48 object-cover border-b border-border/60"
        />
      )}
      <CardHeader className="pb-2">
        <CardTitle>{event.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(event.startsAt, "PPP", { locale: ko })} — {typeLabel(event.type)}
          {event.createdBy?.username && (
            <span className="text-xs"> · @{event.createdBy.username}</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        {event.prize && (
          <p className="text-sm text-neon-pink">🎁 {event.prize}</p>
        )}
        {event.videoUrl && (
          <a
            href={event.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            소개 영상 보기
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {allLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted inline-flex items-center gap-1"
              >
                {l.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover border shrink-0"
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{event._count.participants} 참가</p>
        {showJoin && <EventJoinButton eventId={event.id} />}
      </CardContent>
    </Card>
  );
}
