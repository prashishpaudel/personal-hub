import { Loader2 } from "lucide-react";

// Instant route-transition placeholder (used by each section's loading.tsx).
export default function PageLoading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
      <Loader2 size={16} className="animate-spin" /> Loading…
    </div>
  );
}
