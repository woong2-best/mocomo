import { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { formatLocalClock } from "@/lib/device-timezone";

export function PeerLocalClock({
  timeZone,
  label,
  style,
}: {
  timeZone?: string | null;
  label?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [clock, setClock] = useState(() => (timeZone ? formatLocalClock(timeZone) : ""));

  useEffect(() => {
    if (!timeZone) {
      setClock("");
      return;
    }
    const tick = () => setClock(formatLocalClock(timeZone));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timeZone]);

  if (!timeZone || !clock) return null;
  return <Text style={style}>{label ? `${label} ${clock}` : clock}</Text>;
}

export function PeerMemberClocks({
  members,
  viewerId,
  style,
}: {
  members: { id: string; name: string; timeZone?: string | null }[];
  viewerId?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  const withTz = members.filter((m) => m.timeZone && m.id !== viewerId);
  if (withTz.length === 0) return null;
  return (
    <Text style={style} numberOfLines={1}>
      {withTz.map((m, i) => (
        <PeerLocalClock key={m.id} timeZone={m.timeZone} label={`${i > 0 ? " · " : ""}${m.name}`} />
      ))}
    </Text>
  );
}
