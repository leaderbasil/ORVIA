import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import * as salesService from '../services/sales.service'
import { productKeys } from './useProducts'

export const saleKeys = {
  all: ['sales'],
  lists: () => [...saleKeys.all, 'list'],
  list: (params) => [...saleKeys.lists(), params],
  details: () => [...saleKeys.all, 'detail'],
  detail: (id) => [...saleKeys.details(), id],
  invoice: (id) => [...saleKeys.all, 'invoice', id],
}

export function useSales(params) {
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: () => salesService.listSales(params),
    placeholderData: keepPreviousData,
  })
}

export function useSale(id) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => salesService.getSale(id),
    enabled: Boolean(id),
  })
}

export function useSaleInvoice(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: saleKeys.invoice(id),
    queryFn: () => salesService.getSaleInvoice(id),
    enabled: Boolean(id) && enabled,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, idempotencyKey }) =>
      salesService.createSale(payload, idempotencyKey),
    onSuccess: (sale) => {
      queryClient.setQueryData(saleKeys.detail(sale.id), sale)
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() })
      // Stock changed, so product lists, POS search and low-stock all refresh.
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useCancelSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: salesService.cancelSale,
    onSuccess: (sale) => {
      queryClient.setQueryData(saleKeys.detail(sale.id), sale)
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
