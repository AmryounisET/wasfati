"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <Screen withNavPadding={false}>
      <PageHeader title={t.forgotPassword.title} onBack={() => router.push("/login")} />

      {sent ? (
        <Banner variant="success" title={t.forgotPassword.sentTitle}>
          {t.forgotPassword.sentBody}
        </Banner>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label={t.auth.email}
            labelEn="Email"
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-bodys text-danger-500">{error}</p>}
          <Button type="submit" disabled={loading || !email.trim()}>
            {loading ? t.forgotPassword.submitting : t.forgotPassword.submit}
          </Button>
        </form>
      )}
    </Screen>
  );
}
