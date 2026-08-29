"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { TextField } from "@/components/ui/TextField";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { dirForLocale } from "@/lib/i18n/locales";
import type { Profile, UserType } from "@/lib/supabase/types";

export function ProfileForm({
  profile,
  email: initialEmail,
}: {
  profile: Pick<Profile, "full_name" | "user_type" | "phone_number">;
  email: string;
}) {
  const supabase = createClient();
  const { t, locale } = useTranslation();
  const isRtl = dirForLocale(locale) === "rtl";

  const [fullName, setFullName] = useState(profile.full_name);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [userType, setUserType] = useState<UserType>(profile.user_type);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailUpdateRequested, setEmailUpdateRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userTypeOptions = [
    { value: "patient", label: t.auth.userTypePatient },
    { value: "student", label: t.auth.userTypeStudent },
    { value: "provider", label: t.auth.userTypeProvider },
  ];

  async function save() {
    setSaving(true);
    setError(null);
    setEmailUpdateRequested(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.profile.saveError);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone_number: phone || null, user_type: userType })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    if (email.trim() && email.trim() !== initialEmail) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setError(emailError.message);
        setSaving(false);
        return;
      }
      setEmailUpdateRequested(true);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <TextField
        label={t.profile.fullNameLabel}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <div>
        <TextField
          label={t.profile.emailLabel}
          type="email"
          dir="ltr"
          className={isRtl ? "text-end" : "text-start"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-1 text-caption text-ink-500">{t.profile.emailChangeNote}</p>
      </div>

      <TextField
        label={t.profile.phoneLabel}
        type="tel"
        dir="ltr"
        className={isRtl ? "text-end" : "text-start"}
        placeholder={t.profile.phonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <div>
        <label className="mb-1.5 block text-bodym font-semibold text-ink-900">{t.auth.userTypeLabel}</label>
        <ChoiceChips
          value={userType}
          onChange={(v) => setUserType(v as UserType)}
          options={userTypeOptions}
        />
      </div>

      {emailUpdateRequested && <Banner variant="info">{t.profile.emailUpdateRequested}</Banner>}
      {error && <p className="text-bodys text-danger-500">{error}</p>}

      <Button onClick={save} disabled={saving}>
        {saving ? t.common.saving : saved ? t.common.saved : t.profile.saveButton}
      </Button>
    </div>
  );
}
