import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Link2 } from "lucide-react";
import { getAllSlugs, getNote } from "@/lib/garden";
import GardenToc from "@/components/GardenToc";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNote(slug);
  return { title: note ? `${note.title} · Garden` : "Garden" };
}

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) notFound();

  return (
    <div className="flex gap-8 xl:gap-12">
      <div className="min-w-0 max-w-[780px] flex-1">
        {/* Outside the panel, and sticky — a long cheatsheet would otherwise
            strand you with no way back to the list. */}
        <div className="sticky top-0 z-10 -mx-2 bg-bg/90 px-2 pb-3 pt-2 backdrop-blur">
          <Link
            href="/garden"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
          >
            <ChevronLeft size={16} /> All notes
          </Link>
        </div>

        <article className="space-y-6 rounded-2xl border border-border bg-bg-elevated px-5 py-6 md:px-8 md:py-8">
          <header className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {note.title}
            </h1>
            {note.date && (
              <p className="text-sm text-text-muted">{formatDate(note.date)}</p>
            )}
          </header>

          <div
            className="prose-reader"
            dangerouslySetInnerHTML={{ __html: note.html }}
          />

          {note.backlinks.length > 0 && (
            <footer className="space-y-3 border-t border-border pt-6">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
                <Link2 size={15} /> Linked from
              </h2>
              <ul className="space-y-1.5">
                {note.backlinks.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/garden/${b.slug}`}
                      className="text-sm text-accent-text hover:underline"
                    >
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </footer>
          )}
        </article>
      </div>

      <GardenToc headings={note.headings} />
    </div>
  );
}
