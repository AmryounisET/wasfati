// Hand-written types mirroring supabase/schema.sql, kept here so the app is
// typed without requiring a live project during scaffolding. Once a real
// Supabase project exists, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
// and this file's shape should be a superset of what that produces.

import type { Locale } from "@/lib/i18n/locales";

export type Sex = "male" | "female";
export type UserType = "patient" | "student" | "provider";
export type LanguageCode = Locale;
export type MedicationSource = "manual" | "search" | "scan" | "prescription_ocr";
export type InteractionType =
  | "drug_drug"
  | "duplicate_therapy"
  | "contraindication"
  | "food"
  | "alcohol"
  | "pregnancy"
  | "breastfeeding"
  | "elderly";
export type Severity = "low" | "moderate" | "high" | "unverified";
export type Confidence = "high" | "medium" | "low";
export type ChatSource = "user" | "ai" | "engine";
export type CareCircleStatus = "pending" | "linked" | "revoked";
// Only one elevated tier exists — a user is either a superadmin (a row in
// admin_users) or a normal user (no row). Only the original superadmin
// account can grant/revoke this, checked by email in admin-set-role.
export type AdminRole = "superadmin";
export type LegalDocType = "terms" | "privacy";
export type LandingLocale = Extract<Locale, "ar" | "en">;

export type Profile = {
  id: string;
  full_name: string;
  user_type: UserType;
  phone_number: string | null;
  sex: Sex | null;
  age: number | null;
  blood_type: string | null;
  allergies: string[];
  chronic_conditions: string[];
  senior_friendly_mode: boolean;
  language_code: LanguageCode;
  is_pregnant: boolean | null;
  is_breastfeeding: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Returned by the admin_list_users() RPC — profiles joined with auth.users, admin-only. */
export type AdminUserDirectoryRow = {
  id: string;
  full_name: string;
  user_type: UserType;
  phone_number: string | null;
  is_active: boolean;
  language_code: LanguageCode;
  created_at: string;
  email: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_superadmin: boolean;
}

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  generic_name: string;
  dose: string;
  frequency: string;
  category: string;
  start_date: string;
  notes: string | null;
  low_stock: boolean;
  archived: boolean;
  source: MedicationSource;
  created_at: string;
}

export type DoseLog = {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;
  confirmed_at: string | null;
  created_at: string;
}

export type Interaction = {
  id: string;
  substance_a: string;
  substance_b: string | null;
  interaction_type: InteractionType;
  severity: Severity;
  mechanism: string | null;
  confidence: Confidence | null;
  summary: string;
  patient_summary: string | null;
  citation: string | null;
  created_at: string;
  updated_at: string;
}

export type InteractionResult = {
  id: string;
  user_id: string;
  medication_names: string[];
  interaction_id: string | null;
  severity: Severity;
  summary: string;
  patient_summary: string | null;
  ai_explanation: string | null;
  checked_at: string;
}

// check-interactions returns the persisted row plus the ingredient pair(s)
// that triggered it — `ingredients` is response-only, not a column.
export type InteractionResultWithIngredients = InteractionResult & { ingredients?: string[] };

// Result of the ephemeral Quick Interaction Check — never persisted, so
// this has no id/user_id/checked_at the way InteractionResult does.
export type QuickCheckPair = {
  severity: Severity;
  summary: string;
  patient_summary: string | null;
  names: string[];
  // Ingredient pair(s) behind the reported severity, e.g. "ibuprofen + irbesartan".
  ingredients?: string[];
};

export type ChatMessage = {
  id: string;
  user_id: string;
  source: ChatSource;
  text: string;
  created_at: string;
}

export type CareCircleLink = {
  id: string;
  owner_user_id: string;
  caregiver_user_id: string | null;
  caregiver_email: string;
  relation: string | null;
  can_view_schedule: boolean;
  can_view_missed_dose_alerts: boolean;
  can_view_health_profile: boolean;
  status: CareCircleStatus;
  created_at: string;
}

export type PendingCareCircleInvite = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  relation: string | null;
  can_view_schedule: boolean;
  can_view_missed_dose_alerts: boolean;
  can_view_health_profile: boolean;
  created_at: string;
}

export type LinkedOwnerName = {
  owner_user_id: string;
  full_name: string;
}

export type AdminUser = {
  user_id: string;
  role: AdminRole;
  created_at: string;
}

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type Drug = {
  id: string;
  trade_name: string;
  generic_name: string;
  category: string;
  common_dose: string | null;
  created_at: string;
  updated_at: string;
}

export type DataVersion = {
  table_name: "drugs" | "interactions";
  version: number;
  updated_at: string;
  updated_by: string | null;
  source: string | null;
}

export type WebauthnCredential = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string | null;
  backed_up: boolean;
  transports: string[] | null;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

export type LegalDocument = {
  id: string;
  doc_type: LegalDocType;
  locale: LanguageCode;
  content: string;
  version: string;
  updated_at: string;
  updated_by: string | null;
}

export type LandingPageContentRow = {
  id: string;
  locale: LandingLocale;
  content: LandingPageContentData;
  updated_at: string;
  updated_by: string | null;
};

export type LandingPageContentData = {
  nav: { brand: string; features: string; how: string; cta: string };
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineHighlight: string;
    lede: string;
    ctaPrimary: string;
    ctaLink: string;
    note: string;
  };
  phone: {
    greet: string;
    name: string;
    heroTitle: string;
    heroSub: string;
    heroBtn: string;
    ringTitle: string;
    ringSub: string;
    chip: string;
  };
  stats: {
    medsValue: string;
    medsLabel: string;
    interactionsValue: string;
    interactionsLabel: string;
    langsValue: string;
    langsLabel: string;
  };
  features: {
    eyebrow: string;
    h2: string;
    p: string;
    items: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  how: {
    eyebrow: string;
    h2: string;
    steps: [{ title: string; body: string }, { title: string; body: string }, { title: string; body: string }];
  };
  final: { h2: string; p: string; cta: string };
  install: { h3: string; steps: [string, string, string] };
  footer: { brand: string; disclaimer: string; copy: string };
};

export type Database = {
  // Recent @supabase/supabase-js versions require this marker on generated
  // Database types to resolve the client's schema generics correctly.
  __InternalSupabase: {
    PostgrestVersion: string;
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      medications: {
        Row: Medication;
        Insert: Partial<Medication> & { user_id: string; name: string };
        Update: Partial<Medication>;
        Relationships: [];
      };
      dose_logs: {
        Row: DoseLog;
        Insert: Partial<DoseLog> & { user_id: string; medication_id: string; scheduled_at: string };
        Update: Partial<DoseLog>;
        Relationships: [];
      };
      interactions: {
        Row: Interaction;
        Insert: Partial<Interaction> & {
          substance_a: string;
          interaction_type: InteractionType;
          severity: Severity;
          summary: string;
        };
        Update: Partial<Interaction>;
        Relationships: [];
      };
      interaction_results: {
        Row: InteractionResult;
        Insert: Partial<InteractionResult> & {
          user_id: string;
          medication_names: string[];
          severity: Severity;
          summary: string;
        };
        Update: Partial<InteractionResult>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage> & { user_id: string; source: ChatSource; text: string };
        Update: Partial<ChatMessage>;
        Relationships: [];
      };
      care_circle_links: {
        Row: CareCircleLink;
        Insert: Partial<CareCircleLink> & { owner_user_id: string; caregiver_email: string };
        Update: Partial<CareCircleLink>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUser;
        Insert: Partial<AdminUser> & { user_id: string };
        Update: Partial<AdminUser>;
        Relationships: [];
      };
      drugs: {
        Row: Drug;
        Insert: Partial<Drug> & { trade_name: string; generic_name: string };
        Update: Partial<Drug>;
        Relationships: [];
      };
      legal_documents: {
        Row: LegalDocument;
        Insert: Partial<LegalDocument> & { doc_type: LegalDocType; locale: LanguageCode; content: string };
        Update: Partial<LegalDocument>;
        Relationships: [];
      };
      landing_page_content: {
        Row: LandingPageContentRow;
        Insert: Partial<LandingPageContentRow> & { locale: LandingLocale; content: LandingPageContentData };
        Update: Partial<LandingPageContentRow>;
        Relationships: [];
      };
      data_versions: {
        Row: DataVersion;
        Insert: Partial<DataVersion> & { table_name: "drugs" | "interactions" };
        Update: Partial<DataVersion>;
        Relationships: [];
      };
      webauthn_credentials: {
        Row: WebauthnCredential;
        Insert: Partial<WebauthnCredential> & { user_id: string; credential_id: string; public_key: string };
        Update: Partial<WebauthnCredential>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & { action: string };
        Update: Partial<AuditLog>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_list_users: {
        Args: Record<string, never>;
        Returns: AdminUserDirectoryRow[];
      };
      bump_data_version: {
        Args: { p_table_name: "drugs" | "interactions"; p_source: string };
        Returns: number;
      };
      pending_care_circle_invites: {
        Args: Record<string, never>;
        Returns: PendingCareCircleInvite[];
      };
      linked_owner_names: {
        Args: Record<string, never>;
        Returns: LinkedOwnerName[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
