import type { DataProvider } from '@refinedev/core';
import { apiClient } from '@/core/http/api-client';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const dataProvider: DataProvider = {
  getApiUrl: () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1',

  getList: async ({ resource, pagination, filters, sorters }) => {
    const params = new URLSearchParams();
    params.set('page', String(pagination?.currentPage ?? 1));
    params.set('limit', String(pagination?.pageSize ?? 20));

    filters?.forEach((filter) => {
      if ('field' in filter && filter.value !== undefined && filter.value !== '') {
        params.set(filter.field, String(filter.value));
      }
    });

    const sorter = sorters?.[0];
    if (sorter) {
      params.set('sortBy', sorter.field);
      params.set('sortOrder', sorter.order);
    }

    const result = await apiClient<PaginatedResponse<unknown>>(`/admin/${resource}?${params}`);
    return { data: result.data as never[], total: result.total };
  },

  getOne: async ({ resource, id }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`)) as never,
  }),

  create: async ({ resource, variables }) => ({
    data: (await apiClient(`/admin/${resource}`, {
      method: 'POST',
      body: JSON.stringify(variables),
    })) as never,
  }),

  update: async ({ resource, id, variables }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(variables),
    })) as never,
  }),

  deleteOne: async ({ resource, id }) => ({
    data: (await apiClient(`/admin/${resource}/${id}`, { method: 'DELETE' })) as never,
  }),
};
