import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export default function WidgetCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: LucideIcon;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-bg-elevated p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Icon size={16} className="text-accent-text" />
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-medium text-text-faint transition-colors hover:text-accent-text"
        >
          View all <ArrowRight size={13} />
        </Link>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
