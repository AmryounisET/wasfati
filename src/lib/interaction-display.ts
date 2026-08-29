import { interpolate, type Dictionary } from "@/lib/i18n/get-dictionary";
import type { InteractionResult, UserType } from "@/lib/supabase/types";

/**
 * Patients see a brief, plain-language alert; students and healthcare
 * providers see the full scientific wording (Project Rule: the interaction
 * engine determines risk, this only changes how the same validated result
 * is worded for the reader). Falls back to a generic templated patient
 * message if a specific `patient_summary` wasn't set on the underlying
 * `interactions` row (e.g. legacy data).
 */
export function getDisplaySummary(
  result: Pick<InteractionResult, "summary" | "patient_summary" | "severity">,
  userType: UserType,
  t: Dictionary,
): string {
  if (userType === "patient") {
    return (
      result.patient_summary ??
      interpolate(t.safetyResult.patientGenericTemplate, { severity: t.severity[result.severity] })
    );
  }
  return result.summary;
}
