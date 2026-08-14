import type { NavigatorScreenParams } from "@react-navigation/native";

/** Floating glass tabs: 홈 · 마켓 · 중고 · 메세지 */
export type RootTabParamList = {
  Home: undefined;
  Market: undefined;
  Used: undefined;
  Messages: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  Login: undefined;
  ComposeModal: undefined;
  MessageRoom: { roomId: string; title?: string };
  MessagesNew: undefined;
  DmCall: {
    roomId: string;
    calleeId: string;
    callType: "AUDIO" | "VIDEO";
    displayName: string;
    displayImage?: string | null;
    bookingId?: string;
  };
  IncomingCall: { callId: string };
  Discover: undefined;
  LiveList: undefined;
  LiveDetail: { id: string };
  LiveGoLive: undefined;
  MarketplaceList: undefined;
  MarketplaceDetail: { id: string };
  UsedCreate: undefined;
  UsedMy: undefined;
  UsedPhoneVerify: undefined;
  Market: undefined;
  StarMarketDetail: { id: string };
  SellerListings: undefined;
  SellerRegister: undefined;
  MarketCart: undefined;
  MarketOrders: undefined;
  MarketSellItem: undefined;
  CommunityList: undefined;
  CommunityDetail: { slug: string };
  CommunityCreate: undefined;
  EventsList: undefined;
  EventDetail: { id: string };
  EventsMap: undefined;
  Profile: undefined;
  UserProfile: { username: string };
  PostDetail: { id: string };
  Search: undefined;
  Reels: { postId?: string; mediaId?: string; mediaIndex?: number } | undefined;
  Activity: undefined;
  StarList: undefined;
  AnimeList: undefined;
  AnimeDetail: { slug: string };
  Settings: undefined;
  LegalPolicies: undefined;
  Wallet: undefined;
  GamesHub: undefined;
  Support: undefined;
};
