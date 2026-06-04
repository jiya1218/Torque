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
  role_id?: string;
  is_active?: boolean;
  onboardingRemark?: string | null;
}

export interface UsersListResponse {
  items: User[];
  total: number;
}

const BASE = '/users';

export const usersService = {
  /** Fetch a paginated list of users. */
  list: async (params: { skip?: number; limit?: number; search?: string } = {}): Promise<User[]> => {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set('skip', String(params.skip));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<User[]>(`${BASE}/${query}`);
  },

  /** Get a single user by ID. */
  getById: (id: string): Promise<User> =>
    api.get<User>(`${BASE}/${id}`),

  /** Update a user's role or active status. */
  update: (id: string, data: UserUpdate): Promise<User> =>
    api.patch<User>(`${BASE}/${id}`, data),

  /** Delete/reject a user application. */
  delete: (id: string, permanent = false): Promise<any> =>
    api.delete(`${BASE}/${id}${permanent ? '?permanent=true' : ''}`),
};
