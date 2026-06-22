'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from './api'

const STALE = 60_000

export const useGrid = () => useQuery({ queryKey: ['grid'], queryFn: api.grid, staleTime: STALE })
export const useSources = () => useQuery({ queryKey: ['sources'], queryFn: api.sources, staleTime: STALE })
export const useStations = () => useQuery({ queryKey: ['stations'], queryFn: api.stations, staleTime: STALE, refetchInterval: 30_000 })
export const useForecast = () => useQuery({ queryKey: ['forecast'], queryFn: api.forecast, staleTime: STALE })
export const useEnforcement = () => useQuery({ queryKey: ['enforcement'], queryFn: api.enforcement, staleTime: STALE })
export const useWards = () => useQuery({ queryKey: ['wards'], queryFn: api.wards, staleTime: STALE })
export const useFacilities = () => useQuery({ queryKey: ['facilities'], queryFn: api.facilities, staleTime: STALE })
export const useCities = () => useQuery({ queryKey: ['cities'], queryFn: api.cities, staleTime: STALE })
export const useInsights = () => useQuery({ queryKey: ['insights'], queryFn: api.insights, staleTime: STALE, refetchInterval: 45_000 })
export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: api.overview, staleTime: STALE, refetchInterval: 30_000 })
