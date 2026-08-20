import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServiceRecordUpload from "./ServiceRecordUpload";

export default async function UploadServiceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const [{ data: membership }, { data: vehicle }] = await Promise.all([
    supabase.from("memberships").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(),
  ]);
  if (!membership || !vehicle) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id} · DOCUMENT IMPORT</p><h1>Upload service records</h1><p>Upload a receipt, repair order, or service invoice for {vehicle.name}. The result will be staged for your approval.</p></section><ServiceRecordUpload workspaceId={membership.workspace_id} vehicleId={id} /></main>;
}
