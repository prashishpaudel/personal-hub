import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/supabase-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}
