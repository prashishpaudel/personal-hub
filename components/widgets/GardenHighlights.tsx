import Link from "next/link";
import { Sprout } from "lucide-react";
import type { NoteMeta } from "@/lib/garden";
import WidgetCard from "./WidgetCard";

export default function GardenHighlights({ notes }: { notes: NoteMeta[] }) {
  return (
    <WidgetCard icon={Sprout} title="From the garden" href="/garden">
      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No notes yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {notes.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/garden/${note.slug}`}
                className="block truncate rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-bg-sunken"
              >
                {note.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
