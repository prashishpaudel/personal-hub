import { Rss } from "lucide-react";
import SectionPlaceholder from "@/components/SectionPlaceholder";

export default function FeedPage() {
  return (
    <SectionPlaceholder
      icon={Rss}
      title="Feed"
      blurb="News from your sources"
      phase="Phase 3"
    />
  );
}
