import useSWR from "swr";
import { swrFetcher } from "../api";
import type { SubscriptionPlan, SubscriptionPlansStats } from "../types";

/**
 * Fetches the subscription plans for the analyst.
 *
 * Backend endpoint: GET /subscriptions/analyst/plans
 * Returns: array of SubscriptionPlan objects
 */
export function useSubscriptionPlans() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionPlan[]>(
    "/subscriptions/analyst/plans",
    swrFetcher
  );

  return {
    plans: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetches aggregated stats for the subscription plans.
 *
 * Backend endpoint: GET /subscriptions/analyst/plans/stats
 * Returns: SubscriptionPlansStats object
 */
export function useSubscriptionPlansStats() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionPlansStats>(
    "/subscriptions/analyst/plans/stats",
    swrFetcher
  );

  return {
    stats: data ?? {
      total_subscribers: 0,
      monthly_recurring_revenue: 0,
      active_plans_count: 0,
      total_plans_count: 0,
    },
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
