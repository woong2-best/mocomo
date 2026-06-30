import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";

export function PageSection({
  title,
  icon: Icon,
  description,
  action,
  variant = "default",
  children,
  className,
  headerClassName,
  id,
}: {
  title: string;
  icon?: LucideIcon;
  description?: string;
  action?: { href: string; label: string };
  variant?: "default" | "card" | "plain";
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  id?: string;
}) {
  const header = (
    <div className={cn("flex items-start justify-between gap-3", variant !== "plain" && "mb-3", headerClassName)}>
      <div className="min-w-0">
        <h2 className="font-display font-bold text-base sm:text-lg text-folk-cobalt flex items-center gap-2 leading-tight">
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-folk-terracotta" aria-hidden /> : null}
          <span>{title}</span>
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        ) : null}
        {variant !== "plain" ? (
          <FolkBrushDivider className="mt-2 max-w-[8rem] opacity-55" />
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-xs font-semibold text-primary shrink-0 hover:underline pt-0.5"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );

  if (variant === "card") {
    return (
      <section id={id} className={cn("folk-card rounded-2xl p-4 sm:p-5 min-w-0", className)}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <section id={id} className={cn("min-w-0", className)}>
      {variant !== "plain" ? header : null}
      {children}
    </section>
  );
}
