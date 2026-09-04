import type { NavigatorScreenParams } from "@react-navigation/native";

/** Side drawer destinations (main tabs + stack routes). */
export type DrawerRoute =
  | keyof RootTabParamList
  | "Profile"
  | "ProfileEdit"
  | "Settings"
  | "StarList"
  | "CommunityList"
  | "Wallet"
  | "GamesHub"
  | "AnimeList"
  | "MarketplaceList"
  | "SellerListings"
  | "LiveList"
  | "Discover"
  | "Search"
  | "Activity"
  | "EventsList"
  | "EventsMap"
  | "Reels"
  | "LegalPolicies";

/** Floating glass tabs: 홈 · 마켓 · 중고 · 메세지 */
export type RootTabParamList = {
  Home: undefined;
  Market: undefined;
  Used: undefined;
  Messages: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
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
  MarketMy: undefined;
  MarketWishlist: undefined;
  MarketRecent: undefined;
  MarketCreatorItems: undefined;
  MarketCoupons: undefined;
  MarketSellItem: undefined;
  CommunityList: undefined;
  CommunityDetail: { slug: string };
  CommunityServer: { slug: string };
  CommunityCreate: undefined;
  EventsList: undefined;
  EventDetail: { id: string };
  EventsMap: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
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
  Wallet: { initialTab?: "wallet" | "earnings"; returnScreen?: "UsedCreate" | "MarketplaceList" | "MarketSellItem" } | undefined;
  GamesHub: undefined;
  Support: undefined;
};
