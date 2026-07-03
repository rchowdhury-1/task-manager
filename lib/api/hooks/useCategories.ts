'use client';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { CategoryRecord } from '@/lib/types';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validation/categories';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => apiFetch<CategoryRecord[]>('/categories'),
  });
}

// Slug → CategoryRecord lookup for styling task badges/dots by the owning
// topic's colour. Memoised per categories fetch.
export function useCategoryMap(): Record<string, CategoryRecord> {
  const { data } = useCategories();
  return useMemo(() => {
    const map: Record<string, CategoryRecord> = {};
    data?.forEach((c) => { map[c.slug] = c; });
    return map;
  }, [data]);
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      apiFetch<CategoryRecord>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCategoryInput }) =>
      apiFetch<CategoryRecord>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/v1/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) throw new Error('Delete failed');
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    },
  });
}
