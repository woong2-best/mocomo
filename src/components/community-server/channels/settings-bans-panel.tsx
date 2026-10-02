"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getCommunityBans, unbanCommunityMember } from "@/actions/community-moderation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function CommunityBansPanel({ communityId }: { communityId: string }) {
  const [bans, setBans] = useState<
    {
      id: string;
      userId: string;
      username: string;
      image: string | null;
      reason: string | null;
      expiresAt: Date | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getCommunityBans(communityId);
    setBans(res.bans);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [communityId]);

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-semibold">{t("community-server.s13hwg8k")}</h2>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : bans.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("community-server.sjrqq38")}</p>
      ) : (
        <ul className="space-y-2">
          {bans.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={b.image ?? undefined} />
                  <AvatarFallback>{b.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">@{b.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.reason ?? t("reels.szphc")}
                    {b.expiresAt ? t("community-server.s449h9", { v0: new Date(b.expiresAt).toLocaleString() }) : t("community-server.sltk1g")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void unbanCommunityMember(communityId, b.userId).then(() => load())
                }
              >
                {t("community-server.s11elk")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
