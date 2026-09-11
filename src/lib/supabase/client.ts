import { createBrowserClient } from "@supabase/ssr";

/** Anon key client. Can only ever read approved confessions (see RLS policies). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
