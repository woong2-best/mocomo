"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { MotionInViewIndexed, MotionPress } from "@/components/motion/motion-primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VoiceChannel = {
  id: string;
  name: string;
  maxUsers: number;
  _count: { members: number };
};

export function VoiceChannelList({ channels }: { channels: VoiceChannel[] }) {
  return (
    <div className="grid gap-4">
      {channels.map((ch, i) => (
        <MotionInViewIndexed key={ch.id} index={i}>
          <MotionPress>
            <Link href={`/voice/${ch.id}`}>
              <Card interactive className="hover:border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    {ch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {ch._count.members} / {ch.maxUsers}
                </CardContent>
              </Card>
            </Link>
          </MotionPress>
        </MotionInViewIndexed>
      ))}
    </div>
  );
}
