import { Ionicons } from "@expo/vector-icons";

type Props = {
  size?: number;
  color: string;
};

/** MoCoMo share trigger — globe (replaces share-social 3-node icon). */
export function ShareGlobeIcon({ size = 20, color }: Props) {
  return <Ionicons name="globe-outline" size={size} color={color} />;
}
