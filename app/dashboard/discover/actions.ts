"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDriveEvents } from "@/lib/drive-ntx";

// Interests are personal bookmarks, never tracker events or registrations.
export async function setEventInterest(eventId: string, interested: boolean): Promise<{ error?: string }> {
  if (typeof eventId !== "string" || !/^[a-zA-Z0-9_-]{1,180}$/.test(eventId) || typeof interested !== "boolean") {
    return { error: "Choose a valid event." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to save your shortlist." };
  const { data: member } = await supabase.from("memberships").select("workspace_id")
    .eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!member) return { error: "Create or join a workspace to save your shortlist." };
  if (interested && !(await getDriveEvents()).events.some(event => event.id === eventId)) {
    return { error: "This event is no longer in the upcoming calendar. Refresh and try again." };
  }
  const result = interested
    ? await supabase.from("event_interests").upsert({
      workspace_id: member.workspace_id, user_id: user.id, drive_ntx_event_id: eventId,
    }, { onConflict: "user_id,workspace_id,drive_ntx_event_id", ignoreDuplicates: true })
    : await supabase.from("event_interests").delete()
      .eq("user_id", user.id).eq("workspace_id", member.workspace_id).eq("drive_ntx_event_id", eventId);
  if (result.error) return { error: "Your shortlist could not be saved. Please try again." };
  revalidatePath("/dashboard/discover");
  return {};
}
