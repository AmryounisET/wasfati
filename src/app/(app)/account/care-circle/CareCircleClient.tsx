"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { extractFunctionError } from "@/lib/edge-function-error";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CareCircleLink, PendingCareCircleInvite } from "@/lib/supabase/types";

export function CareCircleClient({
  links,
  incoming,
}: {
  links: CareCircleLink[];
  incoming: PendingCareCircleInvite[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [items, setItems] = useState(links);
  const [incomingItems, setIncomingItems] = useState(incoming);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [canViewSchedule, setCanViewSchedule] = useState(true);
  const [canViewMissedAlerts, setCanViewMissedAlerts] = useState(true);
  const [canViewHealthProfile, setCanViewHealthProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState<string | null>(null);

  type PermissionField = "can_view_schedule" | "can_view_missed_dose_alerts" | "can_view_health_profile";

  async function updatePermission(id: string, field: PermissionField, value: boolean) {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    await supabase
      .from("care_circle_links")
      .update({ [field]: value } as Partial<CareCircleLink>)
      .eq("id", id);
  }

  function resetInviteForm() {
    setEmail("");
    setRelation("");
    setCanViewSchedule(true);
    setCanViewMissedAlerts(true);
    setCanViewHealthProfile(false);
    setInviteError(null);
    setInviteNote(null);
  }

  async function invite() {
    if (!email.trim()) return;
    setSaving(true);
    setInviteError(null);
    setInviteNote(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("care-circle-invite", {
      body: {
        email: email.trim(),
        relation: relation.trim() || null,
        can_view_schedule: canViewSchedule,
        can_view_missed_dose_alerts: canViewMissedAlerts,
        can_view_health_profile: canViewHealthProfile,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    setSaving(false);
    if (error || !data || data.error) {
      setInviteError(data?.error ?? (await extractFunctionError(error, t.careCircle.sendInviteError)));
      return;
    }

    setItems((prev) => [data.link, ...prev]);
    setInviteNote(data.email_sent ? t.careCircle.emailSentNote : t.careCircle.alreadyRegisteredNote);
    setEmail("");
    setRelation("");
    router.refresh();
  }

  async function respondToIncoming(id: string, accept: boolean) {
    setRespondingId(id);
    await supabase
      .from("care_circle_links")
      .update({ status: accept ? "linked" : "revoked" })
      .eq("id", id);
    setIncomingItems((prev) => prev.filter((i) => i.id !== id));
    setRespondingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {incomingItems.length > 0 && (
        <div>
          <h2 className="mb-2 text-h3 font-bold text-ink-900">{t.careCircle.incomingRequestsTitle}</h2>
          <div className="space-y-2">
            {incomingItems.map((inv) => (
              <Card key={inv.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                  <UserRound size={16} />
                </span>
                <div className="flex-1">
                  <p className="text-bodym font-semibold text-ink-900">
                    {inv.owner_name} {t.careCircle.invitedYouAs}
                  </p>
                  <p className="text-caption text-ink-500">{inv.relation || "—"}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => respondToIncoming(inv.id, true)}
                    disabled={respondingId === inv.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-success-700"
                    aria-label={t.careCircle.accept}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToIncoming(inv.id, false)}
                    disabled={respondingId === inv.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-050 text-danger-500"
                    aria-label={t.careCircle.decline}
                  >
                    <X size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((link) => (
          <div key={link.id} className="rounded-lg border border-ink-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                  <UserRound size={16} />
                </span>
                <div>
                  <p className="text-h3 font-bold text-ink-900">{link.caregiver_email}</p>
                  <p className="text-caption text-ink-500">{link.relation || "—"}</p>
                </div>
              </div>
              <Badge variant={link.status === "linked" ? "success" : link.status === "pending" ? "warning" : "danger"}>
                {link.status === "linked"
                  ? t.careCircle.statusLinked
                  : link.status === "pending"
                    ? t.careCircle.statusPending
                    : t.careCircle.statusRevoked}
              </Badge>
            </div>
            <div className="space-y-3">
              <Toggle
                label={t.careCircle.viewSchedule}
                labelEn={t.careCircle.viewScheduleEn}
                checked={link.can_view_schedule}
                onChange={(v) => updatePermission(link.id, "can_view_schedule", v)}
              />
              <Toggle
                label={t.careCircle.missedAlerts}
                labelEn={t.careCircle.missedAlertsEn}
                checked={link.can_view_missed_dose_alerts}
                onChange={(v) => updatePermission(link.id, "can_view_missed_dose_alerts", v)}
              />
              <Toggle
                label={t.careCircle.viewHealthProfile}
                labelEn={t.careCircle.viewHealthProfileEn}
                checked={link.can_view_health_profile}
                onChange={(v) => updatePermission(link.id, "can_view_health_profile", v)}
              />
            </div>
          </div>
        ))}

        {inviting ? (
          <div className="space-y-3 rounded-lg border border-dashed border-primary-300 p-4">
            <TextField label={t.careCircle.emailLabel} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label={t.careCircle.relationLabel}
              placeholder={t.careCircle.relationPlaceholder}
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            />
            <div className="space-y-3 border-t border-ink-100 pt-3">
              <Toggle
                label={t.careCircle.viewSchedule}
                labelEn={t.careCircle.viewScheduleEn}
                checked={canViewSchedule}
                onChange={setCanViewSchedule}
              />
              <Toggle
                label={t.careCircle.missedAlerts}
                labelEn={t.careCircle.missedAlertsEn}
                checked={canViewMissedAlerts}
                onChange={setCanViewMissedAlerts}
              />
              <Toggle
                label={t.careCircle.viewHealthProfile}
                labelEn={t.careCircle.viewHealthProfileEn}
                checked={canViewHealthProfile}
                onChange={setCanViewHealthProfile}
              />
            </div>
            {inviteError && <p className="text-bodys text-danger-500">{inviteError}</p>}
            {inviteNote && <p className="text-bodys text-primary-900">{inviteNote}</p>}
            <div className="flex gap-2">
              <Button size="md" onClick={invite} disabled={saving || !email.trim()}>
                {t.careCircle.sendInvite}
              </Button>
              <Button
                size="md"
                variant="ghost"
                onClick={() => {
                  setInviting(false);
                  resetInviteForm();
                }}
              >
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setInviting(true)}
            className="w-full rounded-md border border-dashed border-primary-300 py-3 text-bodym font-semibold text-primary-900"
          >
            + {t.careCircle.addPersonButton}
          </button>
        )}

        <p className="rounded-md bg-primary-050 p-3 text-caption text-primary-900">{t.careCircle.privacyNote}</p>
      </div>
    </div>
  );
}
