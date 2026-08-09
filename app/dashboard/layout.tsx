import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/dashboard">
          <span>BALL PIT MOTORSPORTS</span>
          <strong>THE GRID</strong>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/events/new">New event</Link>
          <Link href="/dashboard/vehicles">Vehicles</Link>
        </nav>
        <form action={signOut}><button className="text-button">Log out</button></form>
      </header>
      {children}
      <footer className="app-footer">
        <span>© 2026 RMKS Partners LLC d/b/a Ball Pit Motorsports</span>
        <span>Professional Ball Handlers</span>
      </footer>
    </div>
  );
}
