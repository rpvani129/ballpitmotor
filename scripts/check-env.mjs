const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (process.env.VERCEL === "1" && missing.length > 0) {
  console.error(`Missing required Vercel environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (missing.length > 0) {
  console.log(`Local/CI build: configuration check skipped for ${missing.join(", ")}`);
} else {
  console.log("Required application environment variables are configured.");
}
