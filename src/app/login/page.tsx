"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Fingerprint, UserRound, GraduationCap, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { dirForLocale } from "@/lib/i18n/locales";
import { isBiometricLoginAvailable, loginWithBiometrics } from "@/lib/webauthn";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import { Banner } from "@/components/ui/Banner";
import type { UserType } from "@/lib/supabase/types";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useTranslation();
  const isRtl = dirForLocale(locale) === "rtl";

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<UserType>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    isBiometricLoginAvailable().then(setBiometricSupported);
  }, []);

  async function handleBiometricLogin() {
    if (!biometricSupported) {
      setError(t.auth.faceIdUnavailable);
      return;
    }
    setBiometricLoading(true);
    setError(null);
    try {
      await loginWithBiometrics();
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.faceIdUnavailable);
    } finally {
      setBiometricLoading(false);
    }
  }

  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (mode === "login" || fullName.trim().length > 1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, user_type: userType } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-surface-app px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/icons/logo-mark-teal.png"
            alt={t.common.appName}
            width={176}
            height={176}
            priority
            className="mb-3"
          />
          <p className="text-bodys text-ink-500">{t.common.tagline}</p>
        </div>

        <SegmentedControl
          className="mb-6"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "signup", label: t.auth.signup },
            { value: "login", label: t.auth.login },
          ]}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <TextField
                label={t.auth.fullName}
                id="fullName"
                placeholder={t.auth.fullNamePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div>
                <label className="mb-1.5 block text-bodym font-semibold text-ink-900">
                  {t.auth.userTypeLabel}
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "patient", label: t.auth.userTypePatient, icon: UserRound },
                      { value: "student", label: t.auth.userTypeStudent, icon: GraduationCap },
                      { value: "provider", label: t.auth.userTypeProvider, icon: Stethoscope },
                    ] as const
                  ).map((role) => {
                    const active = userType === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setUserType(role.value)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1.5 rounded-md border px-1 py-2.5 text-bodys font-semibold transition-colors duration-[var(--duration-fast)]",
                          active
                            ? "border-primary-500 bg-primary-500 text-white"
                            : "border-ink-300 bg-surface-card text-ink-700",
                        )}
                      >
                        <role.icon size={17} />
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <TextField
            label={t.auth.email}
            labelEn="Email"
            id="email"
            type="email"
            dir="ltr"
            className={isRtl ? "text-end" : "text-start"}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <TextField
              label={t.auth.password}
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {mode === "login" && (
              <button
                type="button"
                className="mt-2 text-bodys font-medium text-primary-700"
                onClick={() => router.push("/login/forgot-password")}
              >
                {t.auth.forgotPassword}
              </button>
            )}
          </div>

          {error && <p className="text-bodys text-danger-500">{error}</p>}

          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? t.auth.submitting : mode === "login" ? t.auth.loginButton : t.auth.signupButton}
          </Button>

          <Button type="button" variant="secondary" onClick={handleBiometricLogin} disabled={biometricLoading}>
            <Fingerprint size={18} />
            {biometricLoading ? t.auth.faceIdSigningIn : t.auth.faceId}
          </Button>
        </form>

        <Banner variant="warning" className="mt-6">
          <p className="text-bodys">
            {t.common.disclaimerShort}
            <br />
            <span className="text-caption">{t.common.disclaimerShortEn}</span>
          </p>
        </Banner>
      </div>
    </div>
  );
}
