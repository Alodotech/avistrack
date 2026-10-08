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
};

export type Admin = {
  id: string;
  email: string;
};

export const AUDIT_ACTIONS = ["SUSPEND", "REACTIVATE", "DELETE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

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
