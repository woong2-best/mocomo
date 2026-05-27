import Link from "next/link";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { notFound } from "next/navigation";
import { auth, isSiteOperator } from "@/lib/auth";
import { getUsedListing } from "@/actions/used-market";
import { UsedDetailActions } from "@/components/used/used-detail-actions";
import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatUsedPrice,
  formatUsedTimeAgo,
  listingImages,
  usedCategoryLabel,
  usedStatusLabel,
} from "@/lib/used-market";
import { ChevronLeft, Eye, ImageOff, MapPin } from "lucide-react";

export default async function UsedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getUsedListing(id, session?.user?.id);
  if (!data) notFound();

  const { listing, favorited } = data;
  const imgs = listingImages(listing.images);
  const isSeller = session?.user?.id === listing.sellerId;
  const isStaff =
    !!session?.user?.username &&
    !!session?.user?.role &&
    isSiteOperator({ username: session.user.username, role: session.user.role });
  const statusLabel = usedStatusLabel(listing.status);

  return (
    <div className="-mx-4 bg-background min-h-[60vh] flex flex-col rounded-xl border border-border overflow-hidden">
      <div className="px-4 border-b border-border/60">
        <ContentModerationBar
          targetType="USED_LISTING"
          targetId={listing.id}
          reportedUserId={listing.sellerId}
          isStaff={isStaff}
          isLoggedIn={!!session?.user}
        />
      </div>
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <Link href="/used" className="p-1 -ml-1">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-medium truncate flex-1">{listing.title}</span>
      </div>

      <div className="aspect-square max-h-[min(70vh,480px)] bg-muted/30 relative w-full">
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {statusLabel && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
            {statusLabel}
          </span>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="flex gap-1 p-2 overflow-x-auto">
          {imgs.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
          ))}
        </div>
      )}

      <div className="p-4 space-y-4 flex-1">
        <div>
          <p className="text-2xl font-black">{formatUsedPrice(listing.price)}</p>
          <h1 className="text-lg font-bold mt-2 leading-snug">{listing.title}</h1>
          <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {listing.region}
            </span>
            <span>·</span>
            <span>{usedCategoryLabel(listing.category)}</span>
            <span>·</span>
            <span>{formatUsedTimeAgo(listing.createdAt)}</span>
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {listing.viewCount}
            </span>
          </p>
        </div>

        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
          {listing.description}
        </p>

        <Link
          href={`/u/${listing.seller.username}`}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border"
        >
          <Avatar className="h-11 w-11">
            <AvatarImage src={listing.seller.image ?? undefined} />
            <AvatarFallback>{listing.seller.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <DisplayNameWithSupportTier
              name={listing.seller.name || listing.seller.username}
              tier={listing.seller.supportTierSent ?? "PEBBLE"}
              nameClassName="font-semibold text-sm"
              compact
            />
            <p className="text-xs text-muted-foreground">@{listing.seller.username} · 판매자</p>
          </div>
        </Link>
      </div>

      <UsedDetailActions
        listingId={listing.id}
        isSeller={!!isSeller}
        isLoggedIn={!!session?.user}
        initialFavorited={favorited}
        status={listing.status}
      />
    </div>
  );
}
