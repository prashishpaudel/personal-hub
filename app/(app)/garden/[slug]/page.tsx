import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Link2 } from "lucide-react";
import { getAllSlugs, getNote } from "@/lib/garden";

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
    <article className="mx-auto max-w-[720px] space-y-6 pt-2">
      <Link
        href="/garden"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ChevronLeft size={16} /> Garden
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {note.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          {note.date && <span>{formatDate(note.date)}</span>}
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-bg-sunken px-2 py-0.5 text-[11px]"
            >
              #{tag}
            </span>
          ))}
        </div>
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
  );
}
