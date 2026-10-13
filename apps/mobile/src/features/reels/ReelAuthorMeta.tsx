import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useI18n } from "@/i18n/I18nProvider";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import {
  reelCollabStack,
  reelDisplayName,
  type ReelCollabUser,
} from "@/features/reels/reel-collaborators";

type Props = {
  author: ReelCollabUser;
  collaborators?: ReelCollabUser[] | null;
};

export function ReelAuthorMeta({ author, collaborators }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { prefetch, open } = useUserProfileNav();
  const [rosterOpen, setRosterOpen] = useState(false);

  useEffect(() => {
    setRosterOpen(false);
  }, [author.id]);

  const others = useMemo(
    () =>
      (collaborators ?? []).filter(
        (u) => u.id && u.id !== author.id && u.username !== author.username
      ),
    [author.id, author.username, collaborators]
  );
  const hasCollab = others.length > 0;
  const stackUsers = hasCollab ? reelCollabStack(author, others) : [author];
  const firstOther = others[0];
  const extraCount = Math.max(0, others.length - 1);
  const roster = hasCollab ? [author, ...others] : [];
  const nickname = reelDisplayName(author);

  const openProfile = (user: ReelCollabUser) => {
    open({
      username: user.username,
      name: user.name,
      image: user.image,
    });
  };

  const prefetchProfile = (user: ReelCollabUser) => {
    prefetch({
      username: user.username,
      name: user.name,
      image: user.image,
    });
  };

  return (
    <>
      <Modal
        visible={rosterOpen && hasCollab}
        transparent
        animationType="fade"
        onRequestClose={() => setRosterOpen(false)}
      >
        <Pressable
          style={[styles.rosterLayer, { paddingTop: insets.top + 48 }]}
          onPress={() => setRosterOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t("m.feed.close_caption")}
        >
          <Pressable style={styles.rosterCard} onPress={() => undefined}>
            <Text style={styles.rosterTitle}>{t("collab.rosterTitle")}</Text>
            {roster.map((u) => (
              <Pressable
                key={u.id}
                style={styles.rosterRow}
                onPressIn={() => prefetchProfile(u)}
                onPress={() => {
                  setRosterOpen(false);
                  openProfile(u);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("m.feed.displayname_profile", {
                  displayName: reelDisplayName(u),
                })}
              >
                <FolkAvatar
                  uri={u.image}
                  name={reelDisplayName(u)}
                  size={32}
                  framed={false}
                  style={styles.rosterAvatar}
                />
                <Text style={styles.rosterName} numberOfLines={1}>
                  {reelDisplayName(u)}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable
        onPressIn={() => (hasCollab ? undefined : prefetchProfile(author))}
        onPress={() => {
          if (hasCollab) {
            setRosterOpen((wasOpen) => !wasOpen);
            return;
          }
          openProfile(author);
        }}
        style={styles.authorRow}
        accessibilityRole="button"
        accessibilityLabel={
          hasCollab
            ? t("collab.rosterTitle")
            : t("m.feed.displayname_profile", { displayName: nickname })
        }
      >
        <View style={styles.stack}>
          {stackUsers.map((u, i) => (
            <FolkAvatar
              key={u.id}
              uri={u.image}
              name={reelDisplayName(u)}
              size={36}
              framed={false}
              style={[styles.metaAvatar, i > 0 ? styles.stackOverlap : null]}
            />
          ))}
        </View>
        {hasCollab && firstOther ? (
          <View style={styles.names}>
            <Text style={styles.user} numberOfLines={1}>
              {t("collab.headerAuthorWith", { name: nickname })}
            </Text>
            <Text style={styles.user} numberOfLines={1}>
              {extraCount > 0
                ? t("collab.headerOthersMore", {
                    name: reelDisplayName(firstOther),
                    count: String(extraCount),
                  })
                : t("collab.headerOther", { name: reelDisplayName(firstOther) })}
            </Text>
          </View>
        ) : (
          <Text style={styles.user} numberOfLines={1}>
            {nickname}
          </Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaAvatar: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  stackOverlap: {
    marginLeft: -10,
  },
  names: {
    minWidth: 0,
    flexShrink: 1,
  },
  user: { color: "#fff", fontWeight: "800", fontSize: 16 },
  rosterLayer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
  },
  rosterCard: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    maxWidth: 320,
  },
  rosterTitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rosterAvatar: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  rosterName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
});
