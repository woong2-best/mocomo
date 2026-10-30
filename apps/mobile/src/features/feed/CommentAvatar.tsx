import { FolkAvatar } from "@/ui/FolkAvatar";

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

/** Same folk squircle as the rest of the app — terracotta letter if no photo. */
export function CommentAvatar({ uri, name, size = 36 }: Props) {
  return <FolkAvatar uri={uri} name={name} size={size} framed={false} />;
}
