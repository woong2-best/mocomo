import { permanentRedirect } from "next/navigation";

/** Legacy URL — canonical home is `/` (see next.config redirects). */
export default function FeedLegacyPage() {
  permanentRedirect("/");
}
