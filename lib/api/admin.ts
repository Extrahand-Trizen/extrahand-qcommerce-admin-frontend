import { api } from '@/lib/api';

export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'CATALOGUE_ADMIN',
  'SELLER_OPERATIONS_ADMIN',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CATALOGUE_ADMIN: 'Catalogue Admin',
  SELLER_OPERATIONS_ADMIN: 'Seller Operations Admin',
  ADMIN: 'Super Admin',
};

export interface AdminUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'inactive';
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminInvite {
  id: string;
  inviteId: string;
  name: string;
  email: string;
  role: string;
  roleLabel?: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface ListUsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export interface ListInvitesResponse {
  invites: AdminInvite[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export async function listUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}): Promise<ListUsersResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.role && params.role !== 'ALL') query.append('role', params.role);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);

  const qs = query.toString();
  const res = await api<ListUsersResponse>(`/admin/users${qs ? `?${qs}` : ''}`);
  return res.data || { users: [], pagination: { total: 0, pages: 1, page: 1, limit: 20 } };
}

export async function getUser(userId: string): Promise<AdminUser> {
  const res = await api<AdminUser>(`/admin/users/${userId}`);
  if (!res.data) throw new Error(res.error || 'Failed to get admin user');
  return res.data;
}

export async function updateUser(
  userId: string,
  updates: {
    name?: string;
    status?: string;
    role?: string;
    password?: string;
  }
): Promise<AdminUser> {
  const res = await api<AdminUser>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.data) throw new Error(res.error || 'Failed to update admin user');
  return res.data;
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
  const res = await api<{ message: string }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
  return res.data || { message: 'Deleted successfully' };
}

export async function listInvites(params?: {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
}): Promise<ListInvitesResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.role && params.role !== 'ALL') query.append('role', params.role);
  if (params?.search) query.append('search', params.search);

  const qs = query.toString();
  const res = await api<ListInvitesResponse>(`/admin/invites${qs ? `?${qs}` : ''}`);
  return res.data || { invites: [], pagination: { total: 0, pages: 1, page: 1, limit: 20 } };
}

export async function createInvite(data: {
  name: string;
  email: string;
  role: string;
}): Promise<AdminInvite> {
  const res = await api<AdminInvite>('/admin/invites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error(res.error || 'Failed to create invitation');
  return res.data;
}

export async function resendInvite(inviteId: string): Promise<{ message: string }> {
  const res = await api<{ message: string }>(`/admin/invites/${inviteId}/resend`, {
    method: 'POST',
  });
  return res.data || { message: 'Invitation resent' };
}

export async function cancelInvite(inviteId: string): Promise<{ message: string }> {
  const res = await api<{ message: string }>(`/admin/invites/${inviteId}`, {
    method: 'DELETE',
  });
  return res.data || { message: 'Invitation cancelled' };
}

export async function acceptInvite(
  inviteId: string,
  payload: {
    token: string;
    password: string;
    name?: string;
  }
): Promise<{ message: string; user: AdminUser }> {
  const res = await api<{ message: string; user: AdminUser }>(`/invites/${inviteId}/accept`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.data) throw new Error(res.error || 'Failed to accept invitation');
  return res.data;
}
