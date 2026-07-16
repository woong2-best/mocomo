"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, X } from "lucide-react";
import {
  ADMIN_LEGACY_NAV,
  ADMIN_PRIMARY_NAV,
  filterNavByPermissions,
  type AdminNavItem,
} from "@/lib/admin/nav";
import type { AdminPermission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: AdminNavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active =
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AdminSidebar({
  open,
  onClose,
  permissions,
}: {
  open?: boolean;
  onClose?: () => void;
  permissions: AdminPermission[];
}) {
  const primary = filterNavByPermissions(ADMIN_PRIMARY_NAV, permissions);
  const legacy = filterNavByPermissions(ADMIN_LEGACY_NAV, permissions);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="사이드바 닫기"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-zinc-950 text-zinc-100 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-white/10 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight" onClick={onClose}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
              <Shield className="h-4 w-4" />
            </span>
            <span>
              MoCoMo <span className="text-zinc-500 font-normal">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Menu
            </p>
            {primary.map((item) => (
              <NavLink key={item.href} {...item} onNavigate={onClose} />
            ))}
          </div>

          {legacy.length > 0 ? (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                운영 도구
              </p>
              {legacy.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onClose} />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="border-t border-white/10 p-3 text-[11px] text-zinc-500">
          Admin CMS · live DB
        </div>
      </aside>
    </>
  );
}
