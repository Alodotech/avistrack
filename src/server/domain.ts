/**
 * Types métier partagés par les repositories et les dashboards.
 * Ils reprennent le modèle de données du cahier des charges (§11) ;
 * `password_hash` n'y figure pas : il ne quitte jamais la couche d'accès aux données.
 */

export const COMPANY_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export type Company = {
  id: string;
  publicId: string;
  name: string;
  email: string;
  phone: string;
  status: CompanyStatus;
  createdAt: Date;
};

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: string;
  companyId: string;
  rating: Rating;
  comment: string | null;
  /** Date de visite au format ISO `AAAA-MM-JJ`. */
  visitDate: string;
  createdAt: Date;
  /**
   * Réponses aux questions personnalisées du formulaire, indexées par
   * identifiant de question. Absent pour les avis de démonstration.
   */
  answers?: Record<string, string>;
};

export type AdminRole = "admin" | "dirigeant";

export type Admin = {
  id: string;
  email: string;
  role?: AdminRole;
  createdAt?: Date;
};

export type AdminMember = {
  id: string;
  userId: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
};

export const QUESTION_TYPES = ["rating", "text", "date"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Nombre maximal de questions dans un formulaire d'avis. */
export const MAX_FORM_QUESTIONS = 5;

export type ReviewFormQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
};

/**
 * Personnalisation du formulaire d'avis public (Studio du formulaire). L'entreprise
 * compose jusqu'à `MAX_FORM_QUESTIONS` questions ; une seule note (étoiles)
 * est imposée pour que les statistiques du tableau de bord restent calculables.
 */
export type ReviewFormConfig = {
  questions: ReviewFormQuestion[];
  /** Titre de l'écran de remerciement. */
  thanksTitle: string;
  /** Message de l'écran de remerciement. */
  thanksMessage: string;
};

export const AUDIT_ACTIONS = [
  "SUSPEND",
  "REACTIVATE",
  "DELETE",
  "INVITE_ADMIN",
  "UPDATE_ADMIN_ROLE",
  "REMOVE_ADMIN",
  "UPDATE_SUBSCRIPTION",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type SubscriptionPlan = "trial" | "pro" | "enterprise";
export type SubscriptionPeriod = "monthly" | "annual" | "trial";

export type CompanySubscription = {
  companyId: string;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
  amount: number;
  updatedAt: Date;
  adminEmail?: string;
};

export type SerializedSubscription = {
  companyId: string;
  plan: SubscriptionPlan;
  period: SubscriptionPeriod;
  amount: number;
  updatedAt: string;
  adminEmail?: string;
};

export type AuditLogEntry = {
  id: string;
  adminId: string;
  action: AuditAction;
  targetCompanyId: string | null;
  metadata: Record<string, string>;
  createdAt: Date;
};

export type Page<T> = {
  items: T[];
  total: number;
};
