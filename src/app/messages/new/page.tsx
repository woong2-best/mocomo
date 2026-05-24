"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDM, createChatRoom } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewMessagePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/users/lookup?username=${encodeURIComponent(username)}`);
    if (!res.ok) {
      setError("유저를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    const result = await getOrCreateDM(id);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("room" in result && result.room) router.push(`/messages/${result.room.id}`);
  }

  async function createPublic() {
    setLoading(true);
    const result = await createChatRoom({ name: "새 팬덤방", type: "FANDOM" });
    setLoading(false);
    if (result.room) router.push(`/messages/${result.room.id}`);
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">개인 DM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={startDm} className="space-y-3">
            <Input
              placeholder="@닉네임"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace("@", ""))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              대화 시작
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">팬덤 / 친목방</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={createPublic} disabled={loading}>
            공개 팬덤방 만들기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
