import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reopenQualityIssue, resolveQualityIssue } from "@/app/dashboard/reports/actions";
import DataQualityClient from "./DataQualityClient";

export default async function DataQualityPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {data:membership}=await supabase.from("memberships").select("workspace_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();if(!membership)redirect("/dashboard");
  const [events,reviews]=await Promise.all([supabase.from("events").select("id,business_id,event_date,event_name,track_name,configuration_name,status,vehicle_id,event_type_id,driver_name,temperature_f,conditions,wind_speed_mph,humidity_pct,track_condition,tire_set_id,front_pad_set_id,rear_pad_set_id,vehicles(name),sessions(id,session_number,started_at,best_lap_ms)").eq("workspace_id",membership.workspace_id).order("event_date",{ascending:false}),supabase.from("data_quality_reviews").select("issue_key,resolution,resolved_at").eq("workspace_id",membership.workspace_id).order("resolved_at",{ascending:false})]);
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/data-management">← Back to Data Management</Link><section className="page-title compact-title"><p className="eyebrow">RECONCILIATION</p><h1>Data quality.</h1><p>Correct the source, confirm the record, or document that historical information is unavailable.</p></section><DataQualityClient events={(events.data??[]) as never[]} reviews={(reviews.data??[]) as never[]} resolveAction={resolveQualityIssue} reopenAction={reopenQualityIssue}/></main>;
}
