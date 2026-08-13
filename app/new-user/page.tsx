import Link from "next/link";
import { redirect } from "next/navigation";
import { saveUserProfile } from "@/app/actions";
import { registerNewUser } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function NewUserPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("user_profiles").select("first_name,last_name,driver_name,driver_number,team_name,onboarding_complete").eq("user_id", user.id).maybeSingle() : { data: null };
  if (user && profile?.onboarding_complete) redirect("/dashboard");
  const metadata = user?.user_metadata ?? {};
  const initialProfile = profile ?? { first_name: metadata.first_name ?? metadata.full_name?.split(" ")?.[0] ?? "", last_name: metadata.last_name ?? metadata.full_name?.split(" ")?.slice(1).join(" ") ?? "", driver_name: metadata.driver_name ?? "", driver_number: null, team_name: null };
  return <main className="new-user-shell"><section className="new-user-brand"><p className="eyebrow">WELCOME TO THE GRID</p><h1>Build your<br />driver profile.</h1><p>Your driver name creates the personalized address for your public event and lap-time pages.</p></section><section className="new-user-card"><div><p className="eyebrow">NEW USER</p><h2>{user ? "Finish your profile" : "Create account"}</h2><p>{user ? `Signed in as ${user.email}` : "Create your login and tell The Grid who is behind the wheel."}</p></div>{query.error && <p className="alert">Your profile could not be saved. Check the required fields and try again.</p>}<ProfileForm action={user ? saveUserProfile : registerNewUser} profile={initialProfile} includeCredentials={!user} />{!user && <p className="new-user-login">Already have an account? <Link href="/login">Log in</Link></p>}</section></main>;
}
