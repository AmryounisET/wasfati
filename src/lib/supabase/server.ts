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

// supabase.auth.getUser() re-validates the JWT against Supabase's Auth
// server on every call — a real network round-trip, not a local cookie
// decode. A single request often renders a layout and a page (and
// sometimes nested components) that each want the current user, so without
// memoization that's 2-3 round-trips before any real data query even
// starts. `cache()` makes every call within one request share the same
// in-flight/resolved call.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
