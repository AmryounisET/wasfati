import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bridges Supabase Auth email links (invite, magic link, password
// recovery) into a real session cookie. Every such link points here with
// a `code` param — @supabase/ssr's server client exchanges it for a
// session and sets the cookie, then we redirect on to wherever the link
// was meant to land (e.g. /care-circle/accept for a care-circle invite).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
