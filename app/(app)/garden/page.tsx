import { getAllNotes } from "@/lib/garden";
import GardenSearch from "@/components/GardenSearch";

export const metadata = { title: "Garden · Personal Hub" };

export default function GardenPage() {
  const notes = getAllNotes();
  // The index/MOC note renders in the explorer, so exclude it from the count.
  const count = notes.filter((n) => n.slug !== "index").length;

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Garden</h1>
        <p className="text-sm text-text-muted">
          {count} {count === 1 ? "note" : "notes"} · your knowledge base
        </p>
      </header>

      <GardenSearch notes={notes} />
    </div>
  );
}
