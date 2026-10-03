import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { fetchAnimeDetail } from "@/api/discovery";
import { AnimeWikiForm } from "@/features/anime/AnimeWikiForm";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

export function AnimeEditScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeEdit">>();
  const query = useQuery({
    queryKey: ["mobile-anime-detail", route.params.slug],
    queryFn: () => fetchAnimeDetail(route.params.slug),
  });

  if (query.isLoading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      </Screen>
    );
  }
  if (query.isError || !query.data?.item) {
    return (
      <Screen>
        <View style={{ padding: 24 }}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>{t("m.anime.could_not_load_the_document")}</Text>
        </View>
      </Screen>
    );
  }

  return <AnimeWikiForm mode="edit" slug={route.params.slug} initial={query.data.item} />;
}
