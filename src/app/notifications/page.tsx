import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          알림
          {unread > 0 && (
            <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-primary/30 text-primary">
              {unread}
            </span>
          )}
        </h1>
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
    </div>
  );
}
