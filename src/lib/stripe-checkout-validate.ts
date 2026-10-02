import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { validatePaymentPayloadCountries } from "@/lib/compliance/ofac-payment-guard";
import { PREMIUM_USD_CENTS } from "@/lib/payments";
import { isMediaContentLocked } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import {
  formatMoney,
  LISTING_FEE_USD_CENTS,
  VENDOR_ONBOARDING_FEE_USD_CENTS,
  MAX_TIP_USD_CENTS,
  MIN_TIP_USD_CENTS,
  EVENT_REGISTRATION_FEE_PER_DAY_USD_CENTS,
} from "@/lib/money";
import {
  calcEventRegistrationFee,
  EVENT_REGISTRATION_MAX_DAYS,
  eventDurationDays,
} from "@/lib/event-registration";
import { assertPaymentNotForAdultContent } from "@/lib/adult-monetization-ban";
import {
  assertAdultVerifiedForPaidDm,
  paymentTypeRequiresAdultVerification,
} from "@/lib/adult-verification/paid-dm-guard";
import {
  LETTER_DONATION_MESSAGE_MAX,
  LETTER_DONATION_MIN_KRW,
} from "@/lib/chat-letter-donation";
import { COMMENT_DONATION_MESSAGE_MAX } from "@/lib/comment-donation";
import {
  calcVideoDonationAmount,
  DEFAULT_VIDEO_DONATION_SETTINGS,
  normalizeYoutubeUrl,
} from "@/lib/video-donation";

export async function validatePaymentInput(
  userId: string,
  input: { type: PaymentIntentType; amount: number; metadata: Record<string, unknown> }
): Promise<{ error: string } | null> {
  const payloadBlock = validatePaymentPayloadCountries(input.metadata);
  if (payloadBlock) return payloadBlock;

  const metaRating =
    input.metadata.contentRating === "ADULT" || input.metadata.isNsfw === true
      ? "ADULT"
      : input.metadata.contentRating === "GENERAL"
        ? "GENERAL"
        : null;
  const metaBlock = assertPaymentNotForAdultContent(metaRating);
  if (metaBlock) return metaBlock;

  if (paymentTypeRequiresAdultVerification(input.type)) {
    const adultBlock = await assertAdultVerifiedForPaidDm(userId);
    if (adultBlock) return { error: adultBlock.error };
  }

  if (input.type === "MOCO_TOPUP") {
    return { error: "MoCo top-ups are discontinued. Pay directly on each product or support screen." };
  }
  if (input.type === "GEM_TOPUP") {
    const gems = Number(input.metadata.gemAmount);
    const { quoteGemTopup } = await import("@/lib/gems/constants");
    const quote = quoteGemTopup(gems);
    if (!quote.ok) {
      return { error: quote.error };
    }
    if (quote.usdCents !== input.amount) {
      return { error: "Top-up amount does not match." };
    }
    return null;
  }
  if (input.type === "FLOWER") {
    return { error: "Flower Gift is discontinued. Complete tips and purchases with direct checkout." };
  }

  if (input.type === "TIP") {
    const receiverId = input.metadata.receiverId as string;
    if (!receiverId || receiverId === userId) return { error: "Invalid tip recipient." };
    const tipKind = input.metadata.tipKind as string | undefined;
    const channelId = input.metadata.channelId as string | undefined;
    const roomId = input.metadata.roomId as string | undefined;
    if (tipKind === "video" && !channelId?.trim()) {
      return { error: "Video tips are only available during a live stream." };
    }
    if (channelId?.trim()) {
      const { assertLiveDonationsAllowed } = await import(
        "@/lib/streaming-accounts/donation-guard"
      );
      const donationCheck = await assertLiveDonationsAllowed(channelId.trim());
      if (!donationCheck.ok) return { error: donationCheck.error };
    }
    if (tipKind === "letter") {
      const msg = String(input.metadata.message ?? "").trim();
      if (!msg) return { error: "Enter letter content." };
      if (msg.length > LETTER_DONATION_MESSAGE_MAX) {
        return { error: `편지는 ${LETTER_DONATION_MESSAGE_MAX}자까지 입력할 수 있습니다.` };
      }
      if (input.amount < LETTER_DONATION_MIN_KRW) {
        return {
          error: `편지 후원 최소 금액은 ${formatMoney(LETTER_DONATION_MIN_KRW)}입니다.`,
        };
      }
      if (roomId?.trim()) {
        const member = await db.chatMember.findUnique({
          where: { roomId_userId: { roomId: roomId.trim(), userId } },
          select: { userId: true },
        });
        if (!member) return { error: "You can send letters only while participating in the message room." };
      }
    } else if (tipKind === "superchat") {
      if (!channelId?.trim()) {
        return { error: "Comment tips are only available during a live stream." };
      }
      const msg = String(input.metadata.message ?? "").trim();
      if (!msg) return { error: "Enter a tip message." };
      if (msg.length > COMMENT_DONATION_MESSAGE_MAX) {
        return {
          error: `후원 메시지는 ${COMMENT_DONATION_MESSAGE_MAX}자까지 입력할 수 있습니다.`,
        };
      }
      if (input.amount < MIN_TIP_USD_CENTS) {
        return { error: `최소 후원 금액은 ${formatMoney(MIN_TIP_USD_CENTS)}입니다.` };
      }
    } else if (tipKind === "video") {
      const videoUrl = normalizeYoutubeUrl(String(input.metadata.videoUrl ?? ""));
      if (!videoUrl) return { error: "Enter a YouTube URL." };
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
          error: `Video 후원 최소 금액은 ${formatMoney(expected)}입니다.`,
        };
      }
    } else {
      if (input.amount < MIN_TIP_USD_CENTS) {
        return { error: `최소 후원 금액은 ${formatMoney(MIN_TIP_USD_CENTS)}입니다.` };
      }
    }
    if (input.amount > MAX_TIP_USD_CENTS) {
      return { error: `1회 후원 한도는 ${formatMoney(MAX_TIP_USD_CENTS)}입니다.` };
    }
  }

  if (input.type === "PRODUCT") {
    const productId = input.metadata.productId as string;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "Product not found." };
    if (product.price !== input.amount) return { error: "Product price does not match." };
  }

  if (input.type === "PREMIUM") {
    if (input.amount !== PREMIUM_USD_CENTS) {
      return { error: "Premium price is invalid." };
    }
  }

  if (input.type === "CREATOR_SUBSCRIPTION") {
    const creatorId = input.metadata.creatorId as string;
    if (!creatorId || creatorId === userId) {
      return { error: "Invalid subscription target." };
    }
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { creatorSubscriptionPriceKrw: true },
    });
    if (!creator) return { error: "Creator not found." };
    if (creator.creatorSubscriptionPriceKrw !== input.amount) {
      return { error: "Subscription price does not match." };
    }
    const existing = await db.subscription.findUnique({
      where: { subscriberId_creatorId: { subscriberId: userId, creatorId } },
      select: { status: true, currentPeriodEnd: true, subscribedSince: true },
    });
    if (existing && isSubscriptionActive(existing)) {
      return { error: "Already subscribed." };
    }
  }

  if (input.type === "EMOTICON") {
    const packId = input.metadata.packId as string;
    const packSlug = input.metadata.packSlug as string | undefined;
    let pack = packId ? await db.emoticonPack.findUnique({ where: { id: packId } }) : null;
    if (!pack && packSlug) {
      pack = await db.emoticonPack.findUnique({ where: { slug: packSlug } });
    }
    if (!pack) return { error: "Emoticon not found. Check DB integration (section J)." };
    if (pack.price !== input.amount) return { error: "Emoticon price does not match." };
  }

  if (input.type === "LISTING_FEE") {
    if (input.amount !== LISTING_FEE_USD_CENTS) {
      return { error: `등록비는 ${formatMoney(LISTING_FEE_USD_CENTS)}입니다.` };
    }
    const requestId = input.metadata.requestId as string;
    const req = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
    if (!req || req.sellerId !== userId) return { error: "Merch listing request not found." };
    if (req.listingFeePaid) return { error: "Listing fee already paid." };
  }

  if (input.type === "VENDOR_ONBOARDING_FEE") {
    if (input.amount !== VENDOR_ONBOARDING_FEE_USD_CENTS) {
      return { error: `판매자 입점비는 ${formatMoney(VENDOR_ONBOARDING_FEE_USD_CENTS)}입니다.` };
    }
    const profile = await db.marketplaceSellerProfile.findUnique({ where: { userId } });
    if (!profile) return { error: "Register your seller profile first." };
    if (profile.isStripeSupported) {
      return { error: "Sellers in Stripe-supported countries have no storefront fee." };
    }
    if (profile.vendorOnboardingFeePaidAt) {
      return { error: "Storefront fee already paid." };
    }
    if (
      !profile.directTradeBankName?.trim() ||
      !profile.directTradeAccountNumber?.trim() ||
      !profile.businessRegNo?.trim()
    ) {
      return { error: "Register direct-sale bank and business information first." };
    }
  }

  if (input.type === "PHYSICAL_GOODS") {
    const orderId = input.metadata.orderId as string;
    const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) return { error: "Order not found." };
    if (order.total !== input.amount) return { error: "Order amount does not match." };
    if (order.status !== "PENDING_PAYMENT") return { error: "Order already paid." };
  }

  if (input.type === "EVENT_REGISTRATION") {
    const eventId = input.metadata.eventId as string;
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.createdById !== userId) {
      return { error: "Event registration not found." };
    }
    if (event.registrationFeePaid) return { error: "Listing fee already paid." };
    const days = eventDurationDays(event.startsAt, event.endsAt);
    if (days > EVENT_REGISTRATION_MAX_DAYS) {
      return { error: `이벤트 기간은 최대 ${EVENT_REGISTRATION_MAX_DAYS}일까지 가능합니다.` };
    }
    const expectedFee = calcEventRegistrationFee(event.startsAt, event.endsAt);
    if (input.amount !== expectedFee) {
      return {
        error: `이벤트 등록비는 ${formatMoney(expectedFee)}입니다. (${days}일 × ${formatMoney(EVENT_REGISTRATION_FEE_PER_DAY_USD_CENTS)})`,
      };
    }
  }

  if (input.type === "CREATOR_EPISODE") {
    const episodeId = input.metadata.episodeId as string;
    const episode = await db.creatorEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) return { error: "Series episode not found." };
    if (episode.price !== input.amount) return { error: "Price does not match." };
    if (episode.price <= 0) return { error: "Free episodes do not require purchase." };
    if (episode.authorId === userId) return { error: "You cannot purchase your own work." };
    const owned = await db.creatorEpisodePurchase.findUnique({
      where: { buyerId_episodeId: { buyerId: userId, episodeId } },
    });
    if (owned) return { error: "Episode already purchased." };
  }

  if (input.type === "POST_MEDIA") {
    const mediaId = String(input.metadata.mediaId ?? "").trim();
    if (!mediaId) return { error: "Media information is missing." };
    const media = await db.postMedia.findUnique({
      where: { id: mediaId },
      include: {
        post: {
          select: {
            authorId: true,
            visibility: true,
            instantPurchasePriceKrw: true,
            isNsfw: true,
            contentRating: true,
          },
        },
      },
    });
    if (!media) return { error: "Media not found." };
    const postRating = media.post.contentRating ?? (media.post.isNsfw ? "ADULT" : "GENERAL");
    const adultBlock = assertPaymentNotForAdultContent(postRating);
    if (adultBlock) return adultBlock;
    if (media.post.authorId === userId) return { error: "You cannot buy your own content." };
    const owned = await db.postMediaPurchase.findUnique({
      where: { buyerId_mediaId: { buyerId: userId, mediaId } },
    });
    if (owned) return { error: "Media already purchased." };
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
    if (!locked || priceKrw <= 0) return { error: "Purchase not required for this content." };
    if (input.amount !== priceKrw) return { error: "Price does not match." };
  }

  if (input.type === "MESSAGE_MEDIA") {
    const attachmentId = String(input.metadata.attachmentId ?? "").trim();
    if (!attachmentId) return { error: "Media information is missing." };
    const attachment = await db.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          select: { senderId: true, roomId: true },
        },
      },
    });
    if (!attachment) return { error: "Media not found." };
    if (attachment.priceKrw <= 0) return { error: "Purchase not required for this media." };
    if (attachment.message.senderId === userId) {
      return { error: "You cannot buy your own content." };
    }
    const member = await db.chatMember.findUnique({
      where: {
        roomId_userId: { roomId: attachment.message.roomId, userId },
      },
      select: { userId: true },
    });
    if (!member) return { error: "Only message room participants can purchase." };
    const owned = await db.messageAttachmentPurchase.findUnique({
      where: { buyerId_attachmentId: { buyerId: userId, attachmentId } },
    });
    if (owned) return { error: "Media already purchased." };
    if (input.amount !== attachment.priceKrw) {
      return { error: "Price does not match." };
    }
  }

  if (input.type === "STUDIO_ASSET") {
    const assetId = input.metadata.studioAssetId as string;
    const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PUBLISHED") return { error: "Studio asset not found." };
    if (asset.creatorId === userId) return { error: "You cannot purchase your own work." };
    if (asset.isFree || asset.priceKrw <= 0) return { error: "Free asset." };
    if (asset.priceKrw !== input.amount) return { error: "Price does not match." };
    const owned = await db.studioUserInventory.findUnique({
      where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
    });
    if (owned) return { error: "Already owned." };
  }

  if (input.type === "CALL_BOOKING") {
    const bookingId = String(input.metadata.bookingId ?? "");
    const booking = await db.creatorCallBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return { error: "Booking not found." };
    if (booking.fanId !== userId) return { error: "No permission for this booking." };
    if (booking.status !== "PAYMENT_PENDING") {
      if (booking.paymentIntentId) return { error: "Booking already paid." };
      return { error: "Booking is not in a payable state." };
    }
    if (booking.amountKrw !== input.amount) {
      return { error: "Payment amount does not match the booking." };
    }
  }

  return null;
}
