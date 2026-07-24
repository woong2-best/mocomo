import { Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { eventDday, eventTypeLabel } from "@/lib/event-registration";

export type EventCardData = {
  title: string;
  type: string;
  imageUrl?: string | null;
  endsAt: Date | string;
  participantCount?: number;
  likeCount?: number;
};

export function EventCard({
  event,
  className,
  interactive = true,
}: {
  event: EventCardData;
  className?: string;
  /** false = preview (no hover scale) */
  interactive?: boolean;
}) {
  const dday = eventDday(event.endsAt);
  const isUrgent = dday.startsWith("D-") && dday !== "D-Day"
    ? Number(dday.slice(2)) <= 7
    : dday === "D-Day";

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1B2135]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        interactive &&
          "hover:scale-[1.02] hover:border-[#A855F7]/45 hover:shadow-[0_12px_40px_-12px_rgba(168,85,247,0.45)]",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#141826]">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1B2135] via-[#1a1530] to-[#141826]">
            <span className="text-3xl opacity-40">✨</span>
          </div>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide backdrop-blur-sm",
            isUrgent
              ? "bg-[#F97316]/90 text-white"
              : "bg-black/55 text-white/90"
          )}
        >
          {dday}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="text-[11px] font-medium text-[#A855F7]">
          {eventTypeLabel(event.type)}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white/95">
          {event.title || "이벤트 제목"}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-white/45">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {(event.likeCount ?? 0).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {(event.participantCount ?? 0).toLocaleString()}
          </span>
        </div>
      </div>
    </article>
  );
}
