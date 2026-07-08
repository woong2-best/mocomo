"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  createChannelCategory,
  deleteChannelCategory,
  getChannelCategories,
} from "@/actions/community-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CommunityCategoriesPanel({ communityId }: { communityId: string }) {
  const [categories, setCategories] = useState<{ id: string; name: string; position: number }[]>(
    []
  );
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getChannelCategories(communityId);
    setCategories(res.categories);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [communityId]);

  async function add() {
    const res = await createChannelCategory(communityId, name);
    if ("error" in res && res.error) alert(res.error);
    else {
      setName("");
      await load();
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-semibold">채널 카테고리</h2>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span>{c.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => void deleteChannelCategory(c.id).then(() => load())}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 카테고리" />
        <Button type="button" size="sm" disabled={!name.trim()} onClick={() => void add()}>
          추가
        </Button>
      </div>
    </section>
  );
}
