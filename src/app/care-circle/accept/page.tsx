"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRound, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { TextField } from "@/components/ui/TextField";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import type { PendingCareCircleInvite, UserType } from "@/lib/supabase/types";

export default function CareCircleAcceptPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [invites, setInvites] = useState<PendingCareCircleInvite[]>([]);

  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<UserType>("patient");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    setLoggedIn(true);

    const [{ data: profile }, { data: pending }] = await Promise.all([
      supabase.from("profiles").select("full_name, user_type").eq("id", user.id).single(),
      supabase.rpc("pending_care_circle_invites"),
    ]);

    setNeedsSetup(!profile?.full_name);
    if (profile?.user_type) setUserType(profile.user_type);
    setInvites(pending ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // One-time load of the invite session's state on mount — there's no
    // prop/state to derive this from and no user event to hook into.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSetup() {
    if (fullName.trim().length < 2 || password.length < 6) return;
    setSubmitting(true);
    setError(null);

    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setSubmitting(false);
      setError(pwError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ full_name: fullName.trim(), user_type: userType }).eq("id", user.id);
      await supabase
        .from("care_circle_links")
        .update({ status: "linked" })
        .eq("caregiver_user_id", user.id)
        .eq("status", "pending");
    }

    setSubmitting(false);
    router.push("/home");
    router.refresh();
  }

  async function respond(id: string, accept: boolean) {
    setRespondingId(id);
    await supabase
      .from("care_circle_links")
      .update({ status: accept ? "linked" : "revoked" })
      .eq("id", id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
    setRespondingId(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <p className="text-bodym text-ink-500">{t.common.loading}</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-bodym text-ink-700">{t.careCircle.acceptLinkExpired}</p>
        <Button onClick={() => router.push("/login")} className="w-auto px-6">
          {t.auth.login}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-surface-app px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/icons/logo-mark-teal.png"
            alt={t.common.appName}
            width={88}
            height={88}
            priority
            className="mb-3"
          />
          <h1 className="text-h1 font-bold text-ink-900">{t.careCircle.acceptTitle}</h1>
        </div>

        {invites.length > 0 && (
          <div className="mb-6 space-y-2">
            {invites.map((inv) => (
              <Card key={inv.id} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                  <UserRound size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-bodym font-semibold text-ink-900">
                    {inv.owner_name || t.account.defaultUser}
                  </p>
                  <p className="text-caption text-ink-500">{inv.relation || "—"}</p>
                </div>
                {!needsSetup && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => respond(inv.id, true)}
                      disabled={respondingId === inv.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-success-700"
                      aria-label={t.careCircle.accept}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(inv.id, false)}
                      disabled={respondingId === inv.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-050 text-danger-500"
                      aria-label={t.careCircle.decline}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {needsSetup ? (
          <div className="space-y-4">
            <Banner variant="info">
              <p className="text-bodys">{t.careCircle.acceptSetupBody}</p>
            </Banner>

            <TextField
              label={t.auth.fullName}
              placeholder={t.auth.fullNamePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <div>
              <label className="mb-1.5 block text-bodym font-semibold text-ink-900">{t.auth.userTypeLabel}</label>
              <ChoiceChips
                value={userType}
                onChange={(v) => setUserType(v as UserType)}
                options={[
                  { value: "patient", label: t.auth.userTypePatient },
                  { value: "student", label: t.auth.userTypeStudent },
                  { value: "provider", label: t.auth.userTypeProvider },
                ]}
              />
            </div>

            <TextField
              label={t.auth.password}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            {error && <p className="text-bodys text-danger-500">{error}</p>}

            <Button
              onClick={completeSetup}
              disabled={submitting || fullName.trim().length < 2 || password.length < 6}
            >
              {submitting ? t.auth.submitting : t.careCircle.acceptSetupButton}
            </Button>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center">
            <p className="mb-4 text-bodym text-ink-500">{t.careCircle.acceptNoneLeft}</p>
            <Button onClick={() => router.push("/home")} className="w-auto px-6">
              {t.careCircle.acceptGoHome}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
