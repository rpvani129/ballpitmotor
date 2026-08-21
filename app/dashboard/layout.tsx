import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("user_profiles").select("onboarding_complete").eq("user_id", user.id).maybeSingle();
  if (!profile?.onboarding_complete) redirect("/new-user");
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/dashboard">
          <span>BALL PIT MOTORSPORTS</span>
          <strong>THE GRID</strong>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/dashboard">Events</Link>
          <Link href="/dashboard/vehicles">Vehicles</Link>
          <Link href="/dashboard/consumables">Tires + pads</Link>
          <Link href="/dashboard/tracks">Tracks</Link>
          <Link href="/dashboard/reports">Reports</Link>
          <Link href="/dashboard/data-management">Data Management</Link>
        </nav>
        <div className="topbar-actions">
          <a href="https://ballpitmotor.com">Ball Pit Motorsports ↗</a>
          <Link href="/dashboard/profile">Profile</Link>
          <form action={signOut}><button className="text-button">Log out</button></form>
        </div>
      </header>
      {children}
      <footer className="app-footer">
        <span>© 2026 RMKS Partners LLC d/b/a Ball Pit Motorsports</span>
        <span>Professional Ball Handlers</span>
      </footer>
    </div>
  );
}
