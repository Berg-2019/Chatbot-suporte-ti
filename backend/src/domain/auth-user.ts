/**
 * Auth User — tipo forte para req.user após JWT validation.
 * Usado nos controllers para substituir `any`.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  profile?: string;
  permissions?: string[];
}
