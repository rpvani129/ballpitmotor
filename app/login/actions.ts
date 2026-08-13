"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/login?error=${error.message.toLowerCase().includes("confirm") ? "unconfirmed" : "invalid"}`);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("user_profiles").select("onboarding_complete").eq("user_id", user.id).maybeSingle() : { data: null };
  redirect(profile?.onboarding_complete ? "/dashboard" : "/new-user");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/login?error=signup");
  redirect("/login?message=check-email");
}

export async function registerNewUser(formData: FormData) {
  const supabase = await createClient();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const driverName = String(formData.get("driver_name") ?? "").trim() || `${firstName}-${lastName}`;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!firstName || !lastName || !email || password.length < 8) redirect("/new-user?error=required");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName, driver_name: driverName, driver_number: String(formData.get("driver_number") ?? "").trim(), team_name: String(formData.get("team_name") ?? "").trim() } },
  });
  if (error) redirect("/new-user?error=signup");
  if (data.session) redirect("/dashboard");
  redirect("/login?message=check-email");
}

export async function signInWithGoogle() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";

  if (!host) redirect("/login?error=oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${protocol}://${host}/auth/callback` },
  });

  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
