import { FunctionsHttpError } from "@supabase/supabase-js";

/** supabase-js's functions.invoke() doesn't populate `data` on a non-2xx
 * response — only `error`, whose `.message` is a generic "Edge Function
 * returned a non-2xx status code" with no detail. The actual JSON body
 * (our own `{ error: "..." }`) is still readable via error.context, a
 * Response object — this pulls the real message back out. */
export async function extractFunctionError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // fall through to generic message below
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
