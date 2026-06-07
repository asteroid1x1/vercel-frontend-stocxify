import useSWR from "swr";
import { swrFetcher } from "../api";
import type { SubscribersResponse } from "../types";

/**
 * Fetches the analyst's recent subscribers from the subscription-service.
 *
 * Backend endpoint: GET /subscriptions/analyst/subscribers?limit=5&sort=recent
 * Returns: paginated list of Subscriber objects
 */
export function useRecentSubscribers(limit = 5) {
  const { data, error, isLoading, mutate } = useSWR<SubscribersResponse>(
    `/subscriptions/analyst/subscribers?limit=${limit}&sort=recent`,
    swrFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    subscribers: data?.subscribers ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetches the full subscriber list (all pages).
 * Used on the Subscribers page.
 */
export function useAllSubscribers(page = 1, limit = 20) {
  const { data, error, isLoading, mutate } = useSWR<SubscribersResponse>(
    `/subscriptions/analyst/subscribers?page=${page}&limit=${limit}`,
    swrFetcher
  );

  return {
    subscribers: data?.subscribers ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
