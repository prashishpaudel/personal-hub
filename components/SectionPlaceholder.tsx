import type { LucideIcon } from "lucide-react";

export default function SectionPlaceholder({
  icon: Icon,
  title,
  blurb,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  phase: string;
}) {
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3 pt-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
          <Icon size={22} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-text-muted">{blurb}</p>
        </div>
      </header>

      <div className="rounded-2xl border border-dashed border-border bg-bg-sunken/40 px-5 py-14 text-center">
        <p className="text-sm font-medium text-text">Coming in {phase}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          This section is scaffolded. The real experience gets built next.
        </p>
      </div>
    </div>
  );
}
