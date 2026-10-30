/**
 * Types de la base Supabase (T10).
 *
 * Ce fichier suit le format produit par `supabase gen types typescript`, mais
 * est écrit à la main tant que le projet n'est pas relié à une instance. Il
 * sera régénéré par `npm run update-types` (voir package.json) une fois les
 * variables `SUPABASE_*` renseignées.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CompanyStatusRow = "active" | "suspended" | "pending";

export type CompanyRow = {
  id: string;
  user_id: string;
  public_id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string;
  logo_url: string | null;
  status: CompanyStatusRow;
  qr_generated_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlanRow = "trial" | "pro" | "enterprise";
export type SubscriptionPeriodRow = "trial" | "monthly" | "annual";
export type SubscriptionStatusRow =
  | "trialing"
  | "active"
  | "canceled"
  | "expired"
  | "suspended";

export type CompanySubscriptionRow = {
  company_id: string;
  plan: SubscriptionPlanRow;
  period: SubscriptionPeriodRow;
  amount: number;
  status: SubscriptionStatusRow;
  started_at: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  company_id: string;
  plan: string;
  period: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  provider: string;
  provider_ref: string | null;
  created_at: string;
};

export type ReportDownloadRow = {
  id: string;
  admin_id: string | null;
  admin_email: string;
  period: string;
  label: string;
  format: "pdf" | "excel" | "csv";
  created_at: string;
};

export type ReviewRow = {
  id: string;
  company_id: string;
  rating: number;
  comment: string | null;
  customer_first_name: string | null;
  customer_name: string | null;
  reviewer_type: "anonymous" | "identified";
  customer_phone: string | null;
  customer_email: string | null;
  visit_date: string | null;
  answers: Json;
  status: string;
  created_at: string;
};

export type ReviewFormConfigRow = {
  id: string;
  company_id: string;
  thanks_title: string;
  thanks_message: string;
  allow_comment: boolean;
  accent_color: string;
  questions: Json;
  allow_anonymous: boolean;
  allow_remarks: boolean;
  updated_at: string;
};

export type AdminRow = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  /** Rôle personnalisé assigné (migration 007). */
  role_id: string | null;
  permissions: Json;
  created_at: string;
};

/** Rôle d'administration personnalisé (migration 007). */
export type AdminRoleRow = {
  id: string;
  name: string;
  permissions: Json;
  created_at: string;
  updated_at: string;
};

export type RemarkRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Json;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/** Entreprise lue par identifiant public (fonction `public_company_by_public_id`). */
export type PublicCompanyRow = {
  id: string;
  public_id: string;
  name: string;
  status: CompanyStatusRow;
};

/** Formulaire public d'une entreprise (fonction `public_form_config`). */
export type PublicFormConfigRow = {
  thanks_title: string;
  thanks_message: string;
  allow_comment: boolean;
  accent_color: string;
  questions: Json;
  allow_anonymous: boolean;
  allow_remarks: boolean;
};

/** Point d'une série mensuelle renvoyé par `platform_stats`. */
export type TrendCountRow = { month: string; count: number };

/** Agrégats de la plateforme calculés en base (fonction `platform_stats`). */
export type PlatformStatsRow = {
  company_count: number;
  suspended_company_count: number;
  review_count: number;
  average_rating: number | null;
  new_companies_last_7_days: number;
  new_companies_last_30_days: number;
  new_companies_previous_30_days: number;
  reviews_last_30_days: number;
  reviews_previous_30_days: number;
  companies_last_12_months: TrendCountRow[];
  reviews_last_12_months: TrendCountRow[];
};

export type Database = {
  public: {
    Tables: {
      companies: Table<CompanyRow>;
      reviews: Table<ReviewRow>;
      review_form_configs: Table<ReviewFormConfigRow>;
      company_remarks: Table<RemarkRow>;
      admins: Table<AdminRow>;
      admin_roles: Table<AdminRoleRow>;
      audit_logs: Table<AuditLogRow>;
      company_subscriptions: Table<CompanySubscriptionRow>;
      payments: Table<PaymentRow>;
      report_downloads: Table<ReportDownloadRow>;
    };
    Views: Record<string, never>;
    Functions: {
      public_company_by_public_id: {
        Args: { p_public_id: string };
        Returns: PublicCompanyRow[];
      };
      public_form_config: {
        Args: { p_public_id: string };
        Returns: PublicFormConfigRow[];
      };
      company_accepts_reviews: {
        Args: { p_company_id: string };
        Returns: boolean;
      };
      platform_stats: {
        Args: Record<string, never>;
        Returns: PlatformStatsRow;
      };
      purge_deleted_companies: {
        Args: { p_retention_days?: number };
        Returns: number;
      };
    };
    Enums: {
      company_status: CompanyStatusRow;
    };
    CompositeTypes: Record<string, never>;
  };
};
