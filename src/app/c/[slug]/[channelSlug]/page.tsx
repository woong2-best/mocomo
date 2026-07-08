import { notFound } from "next/navigation";
import { getCommunityServerContext, getCommunityChannelCached } from "@/lib/community-server/server-data";
import { PostsChannelView } from "@/components/community-server/channels/posts-channel";
import { TextChannelView } from "@/components/community-server/channels/text-channel";
import { VoiceChannelView } from "@/components/community-server/channels/voice-channel-view";
import { LiveChannelView } from "@/components/community-server/channels/live-channel";
import { MembersChannelView } from "@/components/community-server/channels/members-channel";
import { SettingsChannelView } from "@/components/community-server/channels/settings-channel";
import { EventsChannelView } from "@/components/community-server/channels/events-channel";
import { GalleryChannelView } from "@/components/community-server/channels/gallery-channel";
import { FileChannelView } from "@/components/community-server/channels/file-channel";
import { hasPermission } from "@/lib/community-server/permissions";

export const dynamic = "force-dynamic";

export default async function CommunityChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;

  // layout과 동일 request cache 공유 — 추가 DB 왕복 없음
  const [ctx, channel] = await Promise.all([
    getCommunityServerContext(slug),
    getCommunityChannelCached(slug, channelSlug),
  ]);
  if (!ctx || !channel) notFound();

  if (channel.type === "SETTINGS" && !ctx.isOwner) notFound();

  const needsMembership =
    channel.type !== "POSTS" &&
    channel.type !== "MEMBERS" &&
    channel.type !== "GALLERY";
  if (needsMembership && !ctx.isMember && !ctx.isOwner) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground text-sm">
        이 채널을 보려면 커뮤니티에 가입해 주세요.
      </div>
    );
  }

  switch (channel.type) {
    case "POSTS":
      return (
        <PostsChannelView
          communitySlug={slug}
          communityId={ctx.communityId}
          isMember={ctx.isMember}
          isOwner={ctx.isOwner}
        />
      );

    case "TEXT":
    case "ANNOUNCEMENT":
    case "QA":
      if (!channel.chatRoomId) notFound();
      if (!hasPermission(ctx.permissions, "sendMessages") && !ctx.isOwner) {
        return (
          <div className="p-8 text-center text-sm text-muted-foreground">
            채팅 권한이 없습니다.
          </div>
        );
      }
      return (
        <TextChannelView
          roomId={channel.chatRoomId}
          channelId={channel.id}
          channelName={channel.name}
          communityId={ctx.communityId}
          isMember={ctx.isMember || ctx.isOwner}
        />
      );

    case "VOICE":
    case "VIDEO":
      // VIDEO는 사이드바에서 숨기고, 북마크로 오면 동일 통합 룸으로 처리
      if (!channel.voiceChannelId) notFound();
      if (
        !hasPermission(ctx.permissions, "connectVoice") &&
        !hasPermission(ctx.permissions, "useVideo") &&
        !ctx.isOwner
      ) {
        notFound();
      }
      return (
        <VoiceChannelView
          channelId={channel.voiceChannelId}
          channelName={channel.type === "VIDEO" ? "음성/영상" : channel.name}
          maxUsers={channel.maxUsers}
        />
      );

    case "LIVE":
      if (!channel.voiceChannelId) notFound();
      return (
        <LiveChannelView
          voiceChannelId={channel.voiceChannelId}
          channelName={channel.name}
          communitySlug={slug}
          isOwner={ctx.isOwner}
        />
      );

    case "EVENT":
      return <EventsChannelView communityId={ctx.communityId} />;

    case "GALLERY":
      return <GalleryChannelView communityId={ctx.communityId} />;

    case "FILE":
      return <FileChannelView />;

    case "MEMBERS":
      return <MembersChannelView communityId={ctx.communityId} />;

    case "SETTINGS":
      return (
        <SettingsChannelView
          communityId={ctx.communityId}
          communitySlug={slug}
          isOwner={ctx.isOwner}
        />
      );

    default:
      notFound();
  }
}
