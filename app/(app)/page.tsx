import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { sectionItems } from "@/lib/nav";
import { getAllNotes } from "@/lib/garden";
import RecentNotes from "@/components/widgets/RecentNotes";
import FeedHighlights from "@/components/widgets/FeedHighlights";
import GardenHighlights from "@/components/widgets/GardenHighlights";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const gardenNotes = [...getAllNotes()]
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <header className="space-y-1.5 pt-2">
        <p className="text-sm font-medium text-text-faint">{greeting()}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your hub
        </h1>
        <p className="max-w-prose text-[15px] text-text-muted">
          One space for everything — notes, your knowledge garden, feeds, and
          media. Pick up where you left off.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sectionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  <Icon size={22} />
                </span>
                <ArrowUpRight
                  size={20}
                  className="text-text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {item.label}
                </h2>
                <p className="mt-0.5 text-sm text-text-muted">{item.blurb}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
          Recent activity
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RecentNotes />
          <FeedHighlights />
        </div>
        <GardenHighlights notes={gardenNotes} />
      </section>
    </div>
  );
}
