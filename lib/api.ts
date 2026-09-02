const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010/api/v1';

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; details?: unknown }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    const detailText = Array.isArray(json.details)
      ? json.details.join(', ')
      : typeof json.details === 'string'
        ? json.details
        : '';
    throw new Error(detailText ? `${json.error || 'Request failed'}: ${detailText}` : json.error || 'Request failed');
  }
  return json;
}

export async function apiUpload(path: string, formData: FormData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json;
}

export const endpoints = {
  auth: { login: '/auth/login', me: '/auth/me' },
  dashboard: '/admin/dashboard',
  categories: '/categories',
  subcategories: '/subcategories',
  productTypes: '/product-types',
  attributes: '/attributes',
  productTypeAttributes: (id: string) => `/product-type-attributes/${id}`,
  masterProducts: '/master-products',
  masterProductUpload: '/master-products/upload-image',
  productBrands: '/master-products/meta/brands',
  productSubmissions: '/product-submissions',
  sellers: '/sellers',
  sellerApprovals: '/sellers/approvals/list',
  sellerStores: '/sellers/stores',
  sellerStoreCategories: (id: string) => `/sellers/${id}/store/categories`,
  sellerStoreProducts: (id: string) => `/sellers/${id}/store/products`,
};
