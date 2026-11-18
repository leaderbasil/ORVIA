import { keepPreviousData, useQuery } from '@tanstack/react-query'

import * as reportsService from '../services/reports.service'

export const reportKeys = {
  all: ['reports'],
  dashboard: () => [...reportKeys.all, 'dashboard'],
  sales: (params) => [...reportKeys.all, 'sales', params],
  topProducts: (params) => [...reportKeys.all, 'top-products', params],
  inventory: () => [...reportKeys.all, 'inventory'],
}

export function useDashboard() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: reportsService.getDashboard,
  })
}

export function useSalesReport(params) {
  return useQuery({
    queryKey: reportKeys.sales(params),
    queryFn: () => reportsService.getSalesReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useTopProducts(params) {
  return useQuery({
    queryKey: reportKeys.topProducts(params),
    queryFn: () => reportsService.getTopProducts(params),
    placeholderData: keepPreviousData,
  })
}

export function useInventoryReport() {
  return useQuery({
    queryKey: reportKeys.inventory(),
    queryFn: reportsService.getInventoryReport,
  })
}
