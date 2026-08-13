import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionWorkspace } from "@/lib/provision-workspace";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase.from("user_profiles").select("onboarding_complete").eq("user_id", user.id).maybeSingle() : { data: null };
      if (user && profile?.onboarding_complete) {
        try { await provisionWorkspace(supabase, user); }
        catch { return NextResponse.redirect(new URL("/login?error=workspace", requestUrl.origin)); }
      }
      return NextResponse.redirect(new URL(profile?.onboarding_complete ? "/dashboard" : "/new-user", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
}
