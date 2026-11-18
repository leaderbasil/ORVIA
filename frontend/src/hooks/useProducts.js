import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import * as productsService from '../services/products.service'

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [...productKeys.lists(), params],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  search: (term) => [...productKeys.all, 'search', term],
  lowStock: (params) => [...productKeys.all, 'low-stock', params],
}

export function useProducts(params) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.listProducts(params),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: Boolean(id),
  })
}

export function useProductSearch(term) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: productKeys.search(trimmed),
    queryFn: () => productsService.searchProducts(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 10_000,
  })
}

export function useLowStockProducts(params) {
  return useQuery({
    queryKey: productKeys.lowStock(params),
    queryFn: () => productsService.listLowStockProducts(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: productsService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => productsService.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useDisableProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: productsService.disableProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
