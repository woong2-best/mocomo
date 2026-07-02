"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function AnimeAddButton() {
  const { data: session } = useSession();
  const { t } = useLocale();

  if (!session?.user) {
    return (
      <Link href="/auth/signin?callbackUrl=/anime/new">
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          {t("anime.addLogin")}
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/anime/new">
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        {t("anime.addNew")}
      </Button>
    </Link>
  );
}
