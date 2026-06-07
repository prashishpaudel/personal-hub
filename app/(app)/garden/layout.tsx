import { getAllNotes } from "@/lib/garden";
import GardenExplorer from "@/components/GardenExplorer";

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const notes = getAllNotes();

  return (
    <div className="flex gap-8 lg:gap-10">
      <GardenExplorer notes={notes} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
