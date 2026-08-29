"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Smartphone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { isBiometricLoginAvailable, registerBiometricCredential } from "@/lib/webauthn";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { WebauthnCredential } from "@/lib/supabase/types";

function guessDeviceLabel() {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android device";
  if (/mac/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  return "This device";
}

export function SecurityClient({ initialCredentials }: { initialCredentials: WebauthnCredential[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    isBiometricLoginAvailable().then(setSupported);
  }, []);

  async function enable() {
    setEnabling(true);
    setError(null);
    setSuccess(false);
    try {
      await registerBiometricCredential(guessDeviceLabel());
      setSuccess(true);
      router.refresh();
      const { data } = await supabase
        .from("webauthn_credentials")
        .select("*")
        .order("created_at", { ascending: false });
      setCredentials(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.security.genericError);
    } finally {
      setEnabling(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    const { error: deleteError } = await supabase.from("webauthn_credentials").delete().eq("id", id);
    setRemoving(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-900">
            <Fingerprint size={20} />
          </span>
          <div>
            <p className="text-h3 font-bold text-ink-900">{t.security.biometricTitle}</p>
          </div>
        </div>
        <p className="mb-4 text-bodys text-ink-700">{t.security.biometricBody}</p>

        {supported === false && (
          <Banner variant="warning">
            <p className="text-bodys">{t.security.notSupported}</p>
          </Banner>
        )}

        {success && (
          <Banner variant="success" className="mb-3">
            <p className="text-bodys">{t.security.successBanner}</p>
          </Banner>
        )}
        {error && <p className="mb-3 text-bodys text-danger-500">{error}</p>}

        {supported && (
          <Button onClick={enable} disabled={enabling} size="md">
            {enabling ? t.security.enabling : t.security.enableButton}
          </Button>
        )}
      </Card>

      <div>
        <h2 className="mb-2 text-h3 font-bold text-ink-900">{t.security.registeredDevicesTitle}</h2>
        {credentials.length === 0 ? (
          <Card className="text-bodym text-ink-500">{t.security.noDevices}</Card>
        ) : (
          <div className="space-y-2">
            {credentials.map((c) => (
              <Card key={c.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-050 text-primary-700">
                  <Smartphone size={16} />
                </span>
                <div className="flex-1">
                  <p className="text-bodym font-semibold text-ink-900">{c.label ?? "Device"}</p>
                  <p className="text-caption text-ink-500">
                    {c.last_used_at
                      ? new Date(c.last_used_at).toLocaleString()
                      : new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={removing === c.id}
                  className="rounded-md p-1.5 text-danger-500 hover:bg-danger-050"
                  title={t.security.removeDevice}
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
