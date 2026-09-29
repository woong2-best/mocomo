import { useRoute, type RouteProp } from "@react-navigation/native";
import { AnimeWikiForm } from "@/features/anime/AnimeWikiForm";
import type { RootStackParamList } from "@/navigation/types";

export function AnimeCreateScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "AnimeCreate">>();
  return <AnimeWikiForm mode="create" presetGenre={route.params?.genre} />;
}
