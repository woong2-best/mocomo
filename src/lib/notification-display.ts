import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Bell,
  Heart,
  MessageSquare,
  Repeat2,
  UserPlus,
  Mail,
  Radio,
  Gem,
  ShoppingBag,
  Gavel,
  ThumbsUp,
  Users,
  Phone,
  Film,
  Star,
  Store,
  Coins,
  ShieldAlert,
  Megaphone,
} from "lucide-react";

export type NotificationRow = {
  id: string;
  source?: "social" | "apt";
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date | string;
  actor?: {
    id: string;
    username: string | null;
    image: string | null;
  } | null;
};

export function notificationIcon(type: string): {
  Icon: LucideIcon;
  className: string;
} {
  if (type.startsWith("used_auction")) {
    return { Icon: Gavel, className: "text-amber-500" };
  }
  if (type.startsWith("MARKET_") || type === "FLEA_ITEM_SOLD") {
    return { Icon: Store, className: "text-emerald-600" };
  }
  if (type.startsWith("SHOP_")) {
    return { Icon: ShoppingBag, className: "text-violet-600" };
  }
  if (type.startsWith("FLEA_")) {
    return { Icon: Store, className: "text-fuchsia-600" };
  }
  if (type.startsWith("LIVE_")) {
    return { Icon: Radio, className: "text-rose-500" };
  }
  if (type.startsWith("FRAUD_")) {
    return { Icon: ShieldAlert, className: "text-orange-600" };
  }
  if (type === "ADMIN_NOTICE" || type === "SYSTEM") {
    return { Icon: Megaphone, className: "text-blue-600" };
  }
  if (type === "MISSION_REWARD") {
    return { Icon: Coins, className: "text-amber-600" };
  }
  switch (type) {
    case "like":
    case "clip_like":
    case "comment_like":
    case "comment_author_like":
      return { Icon: Heart, className: "text-folk-terracotta" };
    case "comment":
    case "comment_reply":
    case "clip_comment":
    case "comment_pin":
      return { Icon: MessageSquare, className: "text-blue-500" };
    case "mention":
      return { Icon: AtSign, className: "text-violet-500" };
    case "repost":
      return { Icon: Repeat2, className: "text-green-500" };
    case "follow":
      return { Icon: UserPlus, className: "text-sky-500" };
    case "dm":
    case "dm_group":
      return { Icon: Mail, className: "text-indigo-500" };
    case "live":
      return { Icon: Radio, className: "text-rose-500" };
    case "tip":
      return { Icon: Gem, className: "text-fuchsia-500" };
    case "emoticon_gift":
      return { Icon: Star, className: "text-yellow-500" };
    case "goods_order":
      return { Icon: ShoppingBag, className: "text-orange-500" };
    case "vote":
      return { Icon: ThumbsUp, className: "text-emerald-500" };
    case "community_join":
    case "community_join_request":
    case "community_join_approved":
    case "community_join_rejected":
    case "post_collab_invite":
    case "post_collab_accepted":
      return { Icon: Users, className: "text-cyan-500" };
    case "call":
      return { Icon: Phone, className: "text-teal-500" };
    default:
      if (type === "clip_like" || type === "clip_comment") {
        return { Icon: Film, className: "text-purple-500" };
      }
      return { Icon: Bell, className: "text-muted-foreground" };
  }
}

export function notificationCategoryForType(type: string): string {
  if (
    type.startsWith("MARKET_") ||
    type.startsWith("SHOP_") ||
    type.startsWith("FLEA_") ||
    type.startsWith("LIVE_") ||
    type.startsWith("MISSION_") ||
    type.startsWith("FRAUD_") ||
    type === "ADMIN_NOTICE" ||
    type === "SYSTEM"
  ) {
    if (type.startsWith("MARKET_") || type === "FLEA_ITEM_SOLD") return "market";
    if (type.startsWith("SHOP_")) return "shop";
    if (type.startsWith("FLEA_")) return "flea";
    if (type.startsWith("LIVE_")) return "live";
    if (type.startsWith("MISSION_")) return "mission";
    if (type.startsWith("FRAUD_")) return "fraud";
    return "system";
  }
  if (["like", "comment", "comment_reply", "comment_like", "comment_author_like", "comment_pin", "mention", "repost", "follow", "vote"].includes(type)) {
    return "social";
  }
  if (["dm", "dm_group", "call"].includes(type)) return "messages";
  if (type.startsWith("used_auction")) return "market";
  if (["tip", "emoticon_gift", "goods_order"].includes(type)) return "commerce";
  if (["live", "clip_like", "clip_comment"].includes(type)) return "live";
  if (type === "community_join") return "community";
  return "other";
}
