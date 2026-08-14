import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsClient from "./ReportsClient";
import { reopenQualityIssue, resolveQualityIssue } from "./actions";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/dashboard");

  const workspaceId = membership.workspace_id;
  const [eventsResult, tiresResult, padsResult, reviewsResult] = await Promise.all([
    supabase.from("events").select("id,business_id,event_date,event_name,event_type,event_type_id,track_name,configuration_name,organization_name,status,vehicle_id,team_id,team_name,driver_name,temperature_f,conditions,precipitation_in,wind_speed_mph,humidity_pct,track_condition,tire_set_id,front_pad_set_id,rear_pad_set_id,vehicles(id,name),sessions(id,session_number,started_at,best_lap_ms)").eq("workspace_id", workspaceId).order("event_date", { ascending: true }),
    supabase.from("tire_sets").select("id,business_id,manufacturer,model,size,starting_sessions,status,vehicles(name)").eq("workspace_id", workspaceId),
    supabase.from("pad_sets").select("id,business_id,axle,manufacturer,model,compound,starting_sessions,status,vehicles(name)").eq("workspace_id", workspaceId),
    supabase.from("data_quality_reviews").select("issue_key,resolution,resolved_at").eq("workspace_id", workspaceId).order("resolved_at", { ascending: false }),
  ]);

  return (
    <main className="dashboard-main reports-page">
      <section className="page-hero compact report-hero">
        <div>
          <p className="eyebrow">PERFORMANCE + OPERATIONS</p>
          <h1>Reports.</h1>
          <p className="lede dark">Find speed, understand usage, and clean the records behind both.</p>
        </div>
      </section>
      <ReportsClient
        events={(eventsResult.data ?? []) as never[]}
        tires={(tiresResult.data ?? []) as never[]}
        pads={(padsResult.data ?? []) as never[]}
        reviews={(reviewsResult.data ?? []) as never[]}
        resolveAction={resolveQualityIssue}
        reopenAction={reopenQualityIssue}
      />
    </main>
  );
}
