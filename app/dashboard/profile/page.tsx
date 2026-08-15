import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePassword } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("user_profiles").select("first_name,last_name,driver_name,driver_number,team_name,public_slug").eq("user_id", user!.id).single();
  if (!profile) notFound();
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard">← Events</Link><section className="page-title profile-title"><div><p className="eyebrow">ACCOUNT</p><h1>Driver profile.</h1><p>Manage the identity shown in The Grid and the personalized link used for public event sharing.</p></div><Link className="button dark" href="/dashboard/profile/edit">Edit profile</Link></section>{query.saved && <p className="success-message">{query.saved === "password" ? "Password updated." : "Profile updated."}</p>}{query.error && <p className="alert">{query.error === "password" ? "Passwords must match and contain at least eight characters." : "That change could not be saved."}</p>}<section className="settings-stack"><section className="settings-card"><div><p className="eyebrow">PUBLIC IDENTITY</p><h2>{profile.driver_name}</h2><p>Current public path: <strong>/events/{profile.public_slug}</strong>.</p></div><dl className="profile-details"><div><dt>Name</dt><dd>{profile.first_name} {profile.last_name}</dd></div><div><dt>Driver name</dt><dd>{profile.driver_name}</dd></div><div><dt>Driver number</dt><dd>{profile.driver_number || "Not set"}</dd></div><div><dt>Team</dt><dd>{profile.team_name || "Not set"}</dd></div></dl></section><form className="settings-card password-form" action={updatePassword}><div><p className="eyebrow">SECURITY</p><h2>Change password</h2><p>For Google accounts, setting a password also enables email-and-password login for the same account.</p></div><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><label>Confirm new password<input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required /></label><button className="button dark">Update password</button></form></section></main>;
}
