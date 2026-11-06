import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

// Server-side Supabase client for Server Components / Route Handlers /
// Server Actions. Reads/writes the auth session via Next.js cookies().
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // the proxy already refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}

// The signed-in user's id/email, verified without a network call.
// supabase.auth.getUser() asks Supabase's Auth server to re-validate the JWT
// on every call — a cross-region round-trip (~150-250ms from the app's
// Vercel region to the database region) paid by the proxy AND the layout on
// every navigation. getClaims() verifies the JWT signature locally against
// the project's cached signing keys (tokens here are ES256) in ~1ms, and
// still rejects forged or expired tokens. Trade-off: a deleted/signed-out
// user's token stays valid until it expires (~1h); every data query is
// still checked by RLS, and privileged admin actions re-verify the caller
// in their own Edge Function.
//
// `cache()` makes every call within one request share the same result.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
