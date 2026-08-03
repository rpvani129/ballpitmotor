export type SupabaseHealth = {
  configured: boolean;
  reachable: boolean;
  checkedAt: string;
};

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const checkedAt = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { configured: false, reachable: false, checkedAt };
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    return {
      configured: true,
      reachable: response.ok,
      checkedAt,
    };
  } catch {
    return { configured: true, reachable: false, checkedAt };
  }
}
