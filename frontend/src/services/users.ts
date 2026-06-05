/**
 * src/services/users.ts
 * Typed API service for the Users entity.
 * Talks to: GET/POST/PUT /api/v1/users
 */
import { api } from '../utils/api';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  filePath: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  fullName?: string;
  isActive?: boolean;
  role_id: string | null;
  created_at: string;
  updated_at: string;
  role: Role | null;
  personalMobile?: string;
  homeMobile?: string;
  highestQualification?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  onboardingRemark?: string | null;
  onboardingUpdated?: boolean;
  documents?: Document[];
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  fullName?: string;
  role_id?: string;
  is_active?: boolean;
  isActive?: boolean;
  onboardingRemark?: string | null;
}

export interface UsersListResponse {
  items: User[];
  total: number;
}

const BASE = '/users';

const normalizeUser = (u: any): User => {
  if (!u) return u;
  const fullName = u.fullName || u.full_name || '';
  const isActive = u.isActive ?? u.is_active ?? false;
  return {
    ...u,
    fullName,
    full_name: fullName,
    isActive,
    is_active: isActive,
  };
};

export const usersService = {
  /** Fetch a paginated list of users. */
  list: async (params: { skip?: number; limit?: number; search?: string; onboarding?: boolean } = {}): Promise<User[]> => {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.onboarding !== undefined) qs.set('onboarding', String(params.onboarding));
    const query = qs.toString() ? `?${qs}` : '';
    const res = await api.get<any[]>(`${BASE}/${query}`);
    return (Array.isArray(res) ? res : []).map(normalizeUser);
  },

  /** Get a single user by ID. */
  getById: (id: string): Promise<User> =>
    api.get<any>(`${BASE}/${id}`).then(normalizeUser),

  /** Update a user's role or active status. */
  update: (id: string, data: UserUpdate): Promise<User> => {
    const body: any = { ...data };
    if (data.is_active !== undefined) body.isActive = data.is_active;
    if (data.full_name !== undefined) body.fullName = data.full_name;
    return api.patch<any>(`${BASE}/${id}`, body).then(normalizeUser);
  },

  /** Delete/reject a user application. */
  delete: (id: string, permanent = false): Promise<any> =>
    api.delete(`${BASE}/${id}${permanent ? '?permanent=true' : ''}`),
};
