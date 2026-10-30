import { useEffect, useState } from "react";
import { searchMentionUsers, type MentionSearchHit } from "@/api/mention-search";
import { getMentionContext, insertMentionToken } from "@/lib/mention-input";

export function useMentionSuggest(
  value: string,
  cursor: number,
  onChange: (next: string, caret: number) => void
) {
  const [users, setUsers] = useState<MentionSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const ctx = getMentionContext(value, cursor);
    if (!ctx) {
      setOpen(false);
      setUsers([]);
      return;
    }
    setStart(ctx.start);
    setQuery(ctx.query);
    setOpen(true);
  }, [value, cursor]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchMentionUsers(query)
        .then((res) => {
          if (!cancelled) setUsers(Array.isArray(res.users) ? res.users : []);
        })
        .catch(() => {
          if (!cancelled) setUsers([]);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  function insert(username: string) {
    const { next, caret } = insertMentionToken(value, start, cursor, username);
    onChange(next, caret);
    setOpen(false);
    setUsers([]);
  }

  return { users, open: open && users.length > 0, insert };
}
