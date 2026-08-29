"use client";

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { extractFunctionError } from "@/lib/edge-function-error";

/** True only when the browser has a platform authenticator (Face ID,
 * Touch ID, Windows Hello, Android biometric unlock) available — used to
 * decide whether to show the biometric login button at all. */
export async function isBiometricLoginAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function invokeWebauthnFunction(name: string, body: Record<string, unknown>, requireAuth: boolean) {
  const supabase = createClient();
  let headers: Record<string, string> | undefined;
  if (requireAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");
    headers = { Authorization: `Bearer ${session.access_token}` };
  }
  const { data, error } = await supabase.functions.invoke(name, { body, headers });
  if (error || !data || data.error) {
    throw new Error(data?.error ?? (await extractFunctionError(error, `${name} failed`)));
  }
  return data;
}

/** Enrolls the current device's biometric authenticator for the
 * logged-in user. Throws with a message safe to show the user (e.g. they
 * cancelled the prompt, or this browser has no platform authenticator). */
export async function registerBiometricCredential(label: string): Promise<void> {
  const options = await invokeWebauthnFunction("webauthn-register-options", {}, true);
  const response = await startRegistration({ optionsJSON: options });
  await invokeWebauthnFunction("webauthn-register-verify", { response, label }, true);
}

/** Runs the usernameless biometric login ceremony and returns a real,
 * signed-in Supabase session. */
export async function loginWithBiometrics(): Promise<void> {
  const options = await invokeWebauthnFunction("webauthn-login-options", {}, false);
  const response = await startAuthentication({ optionsJSON: options });
  const result = await invokeWebauthnFunction("webauthn-login-verify", { response }, false);

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: result.email,
    token_hash: result.token_hash,
    type: "magiclink",
  });
  if (error) throw new Error(error.message);
}
