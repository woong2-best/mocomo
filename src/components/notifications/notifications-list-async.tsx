import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";

export async function NotificationsListAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="flex items-center justify-end -mt-2 mb-2">
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              모두 읽음
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">알림이 없습니다.</CardContent>
        </Card>
      ) : (
        notifications.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-60" : "border-primary/30 bg-primary/5"}>
            <CardContent className="p-4">
              {n.link ? (
                <Link href={n.link} className="block hover:text-primary">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                </Link>
              ) : (
                <>
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                </>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 capitalize">{n.type}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ko })}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </>
  );
}

export async function NotificationsUnreadBadgeAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;

  const unread = await db.notification.count({
    where: { userId: session.user.id, read: false },
  });

  if (unread === 0) return null;

  return (
    <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-primary/30 text-primary">
      {unread}
    </span>
  );
}
