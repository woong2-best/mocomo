import { ActivityIndicator, View } from "react-native";
import type { ComponentType } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { FeedScreen } from "@/features/feed/FeedScreen";
import { FloatingGlassTabBar } from "@/navigation/FloatingGlassTabBar";
import { navigationRef } from "@/navigation/navigationRef";
import { PushNotificationHandler } from "@/push/PushNotificationHandler";
import { useTheme } from "@/theme/ThemeContext";
import {
  folkDarkNavigationTheme,
  folkLightNavigationTheme,
} from "@/theme/navigation-theme";
import type { RootStackParamList, RootTabParamList } from "@/navigation/types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function UsedTabScreen() {
  const { MarketplaceListScreen } = require("@/features/marketplace/MarketplaceListScreen") as {
    MarketplaceListScreen: ComponentType<{ mode?: string }>;
  };
  return <MarketplaceListScreen mode="tab" />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }}
    >
      <Tab.Screen name="Home" component={FeedScreen} options={{ title: "홈" }} />
      <Tab.Screen
        name="Market"
        getComponent={() => require("@/features/market/MarketScreen").MarketScreen}
        options={{ title: "마켓" }}
      />
      <Tab.Screen name="Used" getComponent={() => UsedTabScreen} options={{ title: "중고" }} />
      <Tab.Screen
        name="Messages"
        getComponent={() =>
          require("@/features/messages/MessagesInboxScreen").MessagesInboxScreen
        }
        options={{ title: "메세지" }}
      />
    </Tab.Navigator>
  );
}

/**
 * Stack screens are required only on first navigation — keeps cold start lean.
 * Non-Home tabs also lazy; Home stays eager for first paint.
 */
export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const theme = isDark ? folkDarkNavigationTheme : folkLightNavigationTheme;
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.terracotta} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <PushNotificationHandler />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          freezeOnBlur: true,
        }}
      >
        {status === "signedIn" ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ComposeModal"
              getComponent={() => require("@/features/compose/ComposeScreen").ComposeScreen}
              options={{ animation: "slide_from_bottom", presentation: "modal" }}
            />
            <Stack.Screen
              name="UsedCreate"
              getComponent={() =>
                require("@/features/marketplace/UsedCreateScreen").UsedCreateScreen
              }
              options={{ animation: "slide_from_bottom", presentation: "modal" }}
            />
            <Stack.Screen
              name="UsedMy"
              getComponent={() => require("@/features/marketplace/UsedMyScreen").UsedMyScreen}
            />
            <Stack.Screen
              name="UsedPhoneVerify"
              getComponent={() =>
                require("@/features/marketplace/UsedPhoneVerifyScreen").UsedPhoneVerifyScreen
              }
            />
            <Stack.Screen
              name="MessageRoom"
              getComponent={() =>
                require("@/features/messages/MessageRoomScreen").MessageRoomScreen
              }
            />
            <Stack.Screen
              name="MessagesNew"
              getComponent={() =>
                require("@/features/messages/MessagesNewScreen").MessagesNewScreen
              }
            />
            <Stack.Screen
              name="DmCall"
              getComponent={() => require("@/features/messages/DmCallScreen").DmCallScreen}
              options={{ presentation: "fullScreenModal", animation: "fade" }}
            />
            <Stack.Screen
              name="IncomingCall"
              getComponent={() =>
                require("@/features/messages/IncomingCallScreen").IncomingCallScreen
              }
              options={{ presentation: "fullScreenModal", animation: "fade" }}
            />
            <Stack.Screen
              name="Discover"
              getComponent={() => require("@/features/discover/DiscoverHubScreen").DiscoverHubScreen}
            />
            <Stack.Screen
              name="LiveList"
              getComponent={() => require("@/features/live/LiveListScreen").LiveListScreen}
            />
            <Stack.Screen
              name="LiveDetail"
              getComponent={() => require("@/features/live/LiveDetailScreen").LiveDetailScreen}
            />
            <Stack.Screen
              name="LiveGoLive"
              getComponent={() => require("@/features/live/LiveGoLiveScreen").LiveGoLiveScreen}
            />
            <Stack.Screen
              name="MarketplaceList"
              getComponent={() =>
                require("@/features/marketplace/MarketplaceListScreen").MarketplaceListScreen
              }
            />
            <Stack.Screen
              name="MarketplaceDetail"
              getComponent={() =>
                require("@/features/marketplace/MarketplaceDetailScreen").MarketplaceDetailScreen
              }
            />
            <Stack.Screen
              name="StarMarketDetail"
              getComponent={() =>
                require("@/features/market/StarMarketDetailScreen").StarMarketDetailScreen
              }
            />
            <Stack.Screen
              name="SellerListings"
              getComponent={() =>
                require("@/features/market/SellerListingsScreen").SellerListingsScreen
              }
            />
            <Stack.Screen
              name="SellerRegister"
              getComponent={() =>
                require("@/features/market/SellerRegisterScreen").SellerRegisterScreen
              }
            />
            <Stack.Screen
              name="MarketCart"
              getComponent={() => require("@/features/market/MarketCartScreen").MarketCartScreen}
            />
            <Stack.Screen
              name="MarketOrders"
              getComponent={() =>
                require("@/features/market/MarketOrdersScreen").MarketOrdersScreen
              }
            />
            <Stack.Screen
              name="MarketSellItem"
              getComponent={() =>
                require("@/features/market/MarketSellItemScreen").MarketSellItemScreen
              }
            />
            <Stack.Screen
              name="CommunityList"
              getComponent={() =>
                require("@/features/community/CommunityListScreen").CommunityListScreen
              }
            />
            <Stack.Screen
              name="CommunityDetail"
              getComponent={() =>
                require("@/features/community/CommunityDetailScreen").CommunityDetailScreen
              }
            />
            <Stack.Screen
              name="CommunityCreate"
              getComponent={() =>
                require("@/features/community/CommunityCreateScreen").CommunityCreateScreen
              }
            />
            <Stack.Screen
              name="EventsList"
              getComponent={() => require("@/features/events/EventsListScreen").EventsListScreen}
            />
            <Stack.Screen
              name="EventDetail"
              getComponent={() => require("@/features/events/EventDetailScreen").EventDetailScreen}
            />
            <Stack.Screen
              name="EventsMap"
              getComponent={() => require("@/features/events/EventsMapScreen").EventsMapScreen}
            />
            <Stack.Screen
              name="Profile"
              getComponent={() => require("@/features/profile/ProfileScreen").ProfileScreen}
            />
            <Stack.Screen
              name="UserProfile"
              getComponent={() => require("@/features/profile/UserProfileScreen").UserProfileScreen}
            />
            <Stack.Screen
              name="PostDetail"
              getComponent={() => require("@/features/feed/PostDetailScreen").PostDetailScreen}
            />
            <Stack.Screen
              name="Search"
              getComponent={() => require("@/features/search/SearchScreen").SearchScreen}
            />
            <Stack.Screen
              name="Reels"
              getComponent={() => require("@/features/reels/ReelsScreen").ReelsScreen}
              options={{ animation: "fade", gestureEnabled: true, fullScreenGestureEnabled: true }}
            />
            <Stack.Screen
              name="Activity"
              getComponent={() => require("@/features/activity/ActivityScreen").ActivityScreen}
            />
            <Stack.Screen
              name="StarList"
              getComponent={() => require("@/features/star/StarListScreen").StarListScreen}
            />
            <Stack.Screen
              name="AnimeList"
              getComponent={() => require("@/features/anime/AnimeListScreen").AnimeListScreen}
            />
            <Stack.Screen
              name="AnimeDetail"
              getComponent={() => require("@/features/anime/AnimeDetailScreen").AnimeDetailScreen}
            />
            <Stack.Screen
              name="Settings"
              getComponent={() => require("@/features/settings/SettingsScreen").SettingsScreen}
            />
            <Stack.Screen
              name="LegalPolicies"
              getComponent={() =>
                require("@/features/legal/LegalPoliciesScreen").LegalPoliciesScreen
              }
            />
            <Stack.Screen
              name="Wallet"
              getComponent={() => require("@/features/wallet/WalletScreen").WalletScreen}
            />
            <Stack.Screen
              name="GamesHub"
              getComponent={() => require("@/features/games/GamesHubScreen").GamesHubScreen}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
