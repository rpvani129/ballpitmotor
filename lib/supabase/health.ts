export type SupabaseHealth = {
  configured: boolean;
  reachable: boolean;
  diagnostic: "connected" | "missing_configuration" | "invalid_url" | "project_unreachable" | "publishable_key_rejected";
  upstreamStatus?: number;
  checkedAt: string;
};

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const checkedAt = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { configured: false, reachable: false, diagnostic: "missing_configuration", checkedAt };
  }

  let baseUrl: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { configured: true, reachable: false, diagnostic: "invalid_url", checkedAt };
    }
    baseUrl = parsed.origin;
  } catch {
    return { configured: true, reachable: false, diagnostic: "invalid_url", checkedAt };
  }

  try {
    const healthResponse = await fetch(`${baseUrl}/auth/v1/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      return {
        configured: true,
        reachable: false,
        diagnostic: "project_unreachable",
        upstreamStatus: healthResponse.status,
        checkedAt,
      };
    }

    const keyResponse = await fetch(`${baseUrl}/auth/v1/settings`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!keyResponse.ok) {
      return {
        configured: true,
        reachable: false,
        diagnostic: "publishable_key_rejected",
        upstreamStatus: keyResponse.status,
        checkedAt,
      };
    }

    return { configured: true, reachable: true, diagnostic: "connected", upstreamStatus: 200, checkedAt };
  } catch {
    return { configured: true, reachable: false, diagnostic: "project_unreachable", checkedAt };
  }
}
