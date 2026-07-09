import AppShell from "@/components/AppShell";
import DialogProvider from "@/components/DialogProvider";
import { getUser } from "@/lib/supabase-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <DialogProvider>
      <AppShell userEmail={user?.email ?? null}>{children}</AppShell>
    </DialogProvider>
  );
}
