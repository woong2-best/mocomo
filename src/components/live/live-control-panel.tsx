"use client";

import { useEffect, useState } from "react";
import { Shield, Settings2, Users, MessageSquare, Ban, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LiveRoleManagementPanel } from "@/components/live/live-role-management-panel";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { LiveChatBansPanel } from "@/components/live/live-chat-bans-panel";
import { ensureStringArray } from "@/lib/ensure-array";

type Perms = {
  role: string;
  permissions: string[];
  canModerate: boolean;
  canManageRoles: boolean;
  canEditBroadcast: boolean;
};

export function LiveControlPanel({
  channelId,
  slowModeSeconds,
  chatBannedWords,
  initialCollabSplit,
  initialDonationAlertsOnStream,
  initialIsNsfw,
  collabCoHostName,
}: {
  channelId: string;
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  initialCollabSplit?: boolean;
  initialDonationAlertsOnStream?: boolean;
  initialIsNsfw?: boolean;
  collabCoHostName?: string | null;
}) {
  const [perms, setPerms] = useState<Perms | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/live/${channelId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPerms(data);
      }
    })();
  }, [channelId]);

  if (!perms || (!perms.canModerate && !perms.canManageRoles && !perms.canEditBroadcast)) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
          <Shield className="h-4 w-4" />
          LIVE CONTROL
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            라이브 관리
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {(perms.canEditBroadcast || perms.role === "OWNER") && (
            <MenuTile
              icon={Settings2}
              label="방송 설정"
              active={openSection === "settings"}
              onClick={() => setOpenSection(openSection === "settings" ? null : "settings")}
            />
          )}
          {perms.canModerate && (
            <MenuTile
              icon={MessageSquare}
              label="채팅 설정"
              active={openSection === "chat"}
              onClick={() => setOpenSection(openSection === "chat" ? null : "chat")}
            />
          )}
          {perms.canManageRoles && (
            <MenuTile
              icon={UserCog}
              label="역할 관리"
              active={openSection === "roles"}
              onClick={() => setOpenSection(openSection === "roles" ? null : "roles")}
            />
          )}
          {perms.canModerate && (
            <MenuTile
              icon={Ban}
              label="차단 사용자"
              active={openSection === "bans"}
              onClick={() => setOpenSection(openSection === "bans" ? null : "bans")}
            />
          )}
          <MenuTile icon={Users} label="시청자" disabled />
        </div>

        <div className="pt-4 border-t border-border/60 mt-2">
          {openSection === "settings" && (perms.canEditBroadcast || perms.role === "OWNER") && (
            <LiveHostSettings
              channelId={channelId}
              slowModeSeconds={slowModeSeconds ?? 0}
              bannedWords={ensureStringArray(chatBannedWords)}
              initialCollabSplit={initialCollabSplit}
              initialDonationAlertsOnStream={initialDonationAlertsOnStream}
              initialIsNsfw={initialIsNsfw}
              collabCoHostName={collabCoHostName}
              embedded
            />
          )}
          {openSection === "chat" && perms.canModerate && (
            <LiveHostSettings
              channelId={channelId}
              slowModeSeconds={slowModeSeconds ?? 0}
              bannedWords={ensureStringArray(chatBannedWords)}
              chatSettingsOnly
              embedded
            />
          )}
          {openSection === "roles" && perms.canManageRoles && (
            <LiveRoleManagementPanel channelId={channelId} />
          )}
          {openSection === "bans" && perms.canModerate && (
            <LiveChatBansPanel channelId={channelId} />
          )}
          {!openSection && (
            <p className="text-sm text-muted-foreground text-center py-6">
              위 메뉴에서 관리 항목을 선택하세요.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuTile({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-colors ${
        disabled
          ? "opacity-40 cursor-not-allowed border-border/40"
          : active
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/60 hover:bg-muted/50"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
