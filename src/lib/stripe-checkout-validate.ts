import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { PREMIUM_USD_CENTS } from "@/lib/payments";
import { isMediaContentLocked } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import { EVENT_REGISTRATION_FEE_KRW } from "@/lib/event-registration";
import {
  calcVideoDonationAmount,
  DEFAULT_VIDEO_DONATION_SETTINGS,
  normalizeYoutubeUrl,
} from "@/lib/video-donation";
import { findMocoTopupPackage } from "@/lib/moco/economy";

export async function validatePaymentInput(
  userId: string,
  input: { type: PaymentIntentType; amount: number; metadata: Record<string, unknown> }
): Promise<{ error: string } | null> {
  if (input.type === "TIP") {
    const receiverId = input.metadata.receiverId as string;
    if (!receiverId || receiverId === userId) return { error: "유효하지 않은 후원 대상입니다." };
    const tipKind = input.metadata.tipKind as string | undefined;
    const channelId = input.metadata.channelId as string | undefined;
    if (tipKind === "video" && !channelId?.trim()) {
      return { error: "영상 후원은 라이브 방송 중에만 가능합니다." };
    }
    if (channelId?.trim()) {
      const { assertLiveDonationsAllowed } = await import(
        "@/lib/streaming-accounts/donation-guard"
      );
      const donationCheck = await assertLiveDonationsAllowed(channelId.trim());
      if (!donationCheck.ok) return { error: donationCheck.error };
    }
    if (tipKind === "video") {
      const videoUrl = normalizeYoutubeUrl(String(input.metadata.videoUrl ?? ""));
      if (!videoUrl) return { error: "YouTube URL을 입력해 주세요." };
      const durationSec = Math.max(
        1,
        parseInt(String(input.metadata.durationSec ?? 0), 10) || 0
      );
      const channel = channelId
        ? await db.voiceChannel.findUnique({
            where: { id: channelId },
            select: {
              videoDonationRateKrw: true,
              videoDonationMinKrw: true,
              videoDonationMaxSec: true,
            },
          })
        : null;
      const settings = {
        rateKrwPerSec:
          channel?.videoDonationRateKrw ?? DEFAULT_VIDEO_DONATION_SETTINGS.rateKrwPerSec,
        minKrw: channel?.videoDonationMinKrw ?? DEFAULT_VIDEO_DONATION_SETTINGS.minKrw,
        maxSec: channel?.videoDonationMaxSec ?? DEFAULT_VIDEO_DONATION_SETTINGS.maxSec,
      };
      const expected = calcVideoDonationAmount(durationSec, settings);
      if (input.amount < expected) {
        return {
          error: `영상 후원 최소 금액은 ${expected.toLocaleString()}원입니다.`,
        };
      }
    } else {
      const min = 100;
      if (input.amount < min) {
        return { error: "최소 후원 금액은 100원입니다." };
      }
    }
    if (input.amount > 10_000_000) return { error: "1회 후원 한도는 1,000만원입니다." };
  }

  if (input.type === "PRODUCT") {
    const productId = input.metadata.productId as string;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "상품을 찾을 수 없습니다." };
    if (product.price !== input.amount) return { error: "상품 가격이 일치하지 않습니다." };
  }

  if (input.type === "PREMIUM") {
    if (input.amount !== PREMIUM_USD_CENTS) {
      return { error: "프리미엄 가격이 올바르지 않습니다." };
    }
  }

  if (input.type === "CREATOR_SUBSCRIPTION") {
    const creatorId = input.metadata.creatorId as string;
    if (!creatorId || creatorId === userId) {
      return { error: "유효하지 않은 구독 대상입니다." };
    }
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { creatorSubscriptionPriceKrw: true },
    });
    if (!creator) return { error: "크리에이터를 찾을 수 없습니다." };
    if (creator.creatorSubscriptionPriceKrw !== input.amount) {
      return { error: "구독 가격이 일치하지 않습니다." };
    }
    const existing = await db.subscription.findUnique({
      where: { subscriberId_creatorId: { subscriberId: userId, creatorId } },
      select: { status: true, currentPeriodEnd: true, subscribedSince: true },
    });
    if (existing && isSubscriptionActive(existing)) {
      return { error: "이미 구독 중입니다." };
    }
  }

  if (input.type === "EMOTICON") {
    const packId = input.metadata.packId as string;
    const packSlug = input.metadata.packSlug as string | undefined;
    let pack = packId ? await db.emoticonPack.findUnique({ where: { id: packId } }) : null;
    if (!pack && packSlug) {
      pack = await db.emoticonPack.findUnique({ where: { slug: packSlug } });
    }
    if (!pack) return { error: "이모티콘을 찾을 수 없습니다. DB 연동(섹션 J)을 확인해 주세요." };
    if (pack.price !== input.amount) return { error: "이모티콘 가격이 일치하지 않습니다." };
  }

  if (input.type === "FLOWER") {
    const flowerTypeId = input.metadata.flowerTypeId as string;
    const quantity = Math.max(1, Math.min(20, Number(input.metadata.quantity) || 1));
    const flower = await db.flowerType.findUnique({ where: { id: flowerTypeId } });
    if (!flower || !flower.active) return { error: "Flower Gift를 찾을 수 없습니다." };
    if (flower.priceKrw * quantity !== input.amount) {
      return { error: "Flower Gift 가격이 일치하지 않습니다." };
    }
  }

  if (input.type === "LISTING_FEE") {
    if (input.amount !== LISTING_FEE_KRW) return { error: "등록비는 5,000원입니다." };
    const requestId = input.metadata.requestId as string;
    const req = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
    if (!req || req.sellerId !== userId) return { error: "굿즈 등록 요청을 찾을 수 없습니다." };
    if (req.listingFeePaid) return { error: "이미 등록비가 결제되었습니다." };
  }

  if (input.type === "PHYSICAL_GOODS") {
    const orderId = input.metadata.orderId as string;
    const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) return { error: "주문을 찾을 수 없습니다." };
    if (order.total !== input.amount) return { error: "주문 금액이 일치하지 않습니다." };
    if (order.status !== "PENDING_PAYMENT") return { error: "이미 결제된 주문입니다." };
  }

  if (input.type === "EVENT_REGISTRATION") {
    if (input.amount !== EVENT_REGISTRATION_FEE_KRW) {
      return { error: "이벤트 등록비는 30,000원입니다." };
    }
    const eventId = input.metadata.eventId as string;
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.createdById !== userId) {
      return { error: "이벤트 등록 정보를 찾을 수 없습니다." };
    }
    if (event.registrationFeePaid) return { error: "이미 등록비가 결제되었습니다." };
  }

  if (input.type === "CREATOR_EPISODE") {
    const episodeId = input.metadata.episodeId as string;
    const episode = await db.creatorEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) return { error: "작품 회차를 찾을 수 없습니다." };
    if (episode.price !== input.amount) return { error: "가격이 일치하지 않습니다." };
    if (episode.price <= 0) return { error: "무료 회차는 구매가 필요 없습니다." };
    if (episode.authorId === userId) return { error: "본인 작품은 구매할 수 없습니다." };
    const owned = await db.creatorEpisodePurchase.findUnique({
      where: { buyerId_episodeId: { buyerId: userId, episodeId } },
    });
    if (owned) return { error: "이미 구매한 회차입니다." };
  }

  if (input.type === "POST_MEDIA") {
    const mediaId = input.metadata.mediaId as string;
    const media = await db.postMedia.findUnique({
      where: { id: mediaId },
      include: {
        post: {
          select: {
            authorId: true,
            visibility: true,
            instantPurchasePriceKrw: true,
          },
        },
      },
    });
    if (!media) return { error: "미디어를 찾을 수 없습니다." };
    if (media.post.authorId === userId) return { error: "본인 콘텐츠는 구매할 수 없습니다." };
    const owned = await db.postMediaPurchase.findUnique({
      where: { buyerId_mediaId: { buyerId: userId, mediaId } },
    });
    if (owned) return { error: "이미 구매한 미디어입니다." };
    const sub = await db.subscription.findUnique({
      where: {
        subscriberId_creatorId: { subscriberId: userId, creatorId: media.post.authorId },
      },
      select: { subscribedSince: true, currentPeriodEnd: true, status: true },
    });
    const { priceKrw, locked } = isMediaContentLocked({
      viewerId: userId,
      authorId: media.post.authorId,
      visibility: media.post.visibility,
      instantPurchasePriceKrw: media.post.instantPurchasePriceKrw,
      mediaPriceKrw: media.priceKrw,
      purchased: false,
      subscription: sub,
    });
    if (!locked || priceKrw <= 0) return { error: "구매가 필요 없는 콘텐츠입니다." };
    if (input.amount !== priceKrw) return { error: "가격이 일치하지 않습니다." };
  }

  if (input.type === "STUDIO_ASSET") {
    const assetId = input.metadata.studioAssetId as string;
    const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PUBLISHED") return { error: "Studio 자산을 찾을 수 없습니다." };
    if (asset.creatorId === userId) return { error: "본인 작품은 구매할 수 없습니다." };
    if (asset.isFree || asset.priceKrw <= 0) return { error: "무료 자산입니다." };
    if (asset.priceKrw !== input.amount) return { error: "가격이 일치하지 않습니다." };
    const owned = await db.studioUserInventory.findUnique({
      where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
    });
    if (owned) return { error: "이미 보유 중입니다." };
  }

  if (input.type === "MOCO_TOPUP") {
    const mocoAmount = Number(input.metadata.mocoAmount);
    const pack = findMocoTopupPackage(mocoAmount);
    if (!pack) return { error: "지원하지 않는 모코 충전 패키지입니다." };
    if (input.amount !== pack.krw) {
      return { error: "모코 충전 금액이 패키지와 일치하지 않습니다." };
    }
  }

  if (input.type === "CALL_BOOKING") {
    const bookingId = String(input.metadata.bookingId ?? "");
    const booking = await db.creatorCallBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return { error: "예약을 찾을 수 없습니다." };
    if (booking.fanId !== userId) return { error: "예약 권한이 없습니다." };
    if (booking.status !== "PAYMENT_PENDING") {
      if (booking.paymentIntentId) return { error: "이미 결제된 예약입니다." };
      return { error: "결제할 수 없는 예약 상태입니다." };
    }
    if (booking.amountKrw !== input.amount) {
      return { error: "결제 금액이 예약과 일치하지 않습니다." };
    }
  }

  return null;
}
