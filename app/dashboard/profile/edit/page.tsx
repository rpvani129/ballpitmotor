import Link from "next/link";
import { notFound } from "next/navigation";
import { saveUserProfile } from "@/app/actions";
import ProfileForm from "@/app/new-user/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from("user_profiles").select("first_name,last_name,driver_name,driver_number,team_name").eq("user_id", user.id).single();
  if (!profile) notFound();

  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/profile">← Back to profile</Link><section className="page-title compact-title"><p className="eyebrow">ACCOUNT</p><h1>Edit profile.</h1><p>Update the driver identity used throughout The Grid and on your public event link.</p></section>{query.error && <p className="alert">That change could not be saved.</p>}<section className="form-card profile-edit-card"><ProfileForm action={saveUserProfile} profile={profile} mode="edit" cancelHref="/dashboard/profile" /></section></main>;
}
