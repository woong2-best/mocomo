"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/shell/admin-sidebar";
import { AdminHeader } from "@/components/admin/shell/admin-header";
import { getAdminPageTitle } from "@/lib/admin/nav";

export function AdminShell({
  children,
  adminName,
  adminImage,
}: {
  children: React.ReactNode;
  adminName: string;
  adminImage?: string | null;
}) {
  const pathname = usePathname() ?? "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = getAdminPageTitle(pathname);

  return (
    <div className="flex min-h-dvh bg-zinc-50 text-foreground dark:bg-zinc-950">
      <AdminSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          title={title}
          adminName={adminName}
          adminImage={adminImage}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
