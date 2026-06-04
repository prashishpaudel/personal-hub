import { NotebookPen } from "lucide-react";
import SectionPlaceholder from "@/components/SectionPlaceholder";

export default function NotesPage() {
  return (
    <SectionPlaceholder
      icon={NotebookPen}
      title="Notes"
      blurb="Quick thoughts and scratch"
      phase="Phase 2"
    />
  );
}
