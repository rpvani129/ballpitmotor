import { NextResponse } from "next/server";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkSupabaseHealth();
  const healthy = health.configured && health.reachable;

  return NextResponse.json(
    {
      service: "supabase",
      status: healthy ? "connected" : "unavailable",
      ...health,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
