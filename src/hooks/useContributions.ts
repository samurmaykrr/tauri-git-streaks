/**
 * # useContributions Hook
 *
 * Custom React hook for fetching and managing GitHub contribution data.
 *
 * ## Hook State Machine
 *
 * ```
 *                    ┌─────────────────┐
 *                    │     Initial     │
 *                    │  isLoading: true│
 *                    └────────┬────────┘
 *                             │
 *                             ▼
 *              ┌──────────────────────────────┐
 *              │      Fetch Cached Data       │
 *              └──────────────┬───────────────┘
 *                             │
 *              ┌──────────────┴───────────────┐
 *              ▼                              ▼
 *     ┌────────────────┐            ┌────────────────┐
 *     │  Cache Found   │            │  No Cache      │
 *     │  Show cached   │            │                │
 *     └───────┬────────┘            └───────┬────────┘
 *             │                             │
 *             └──────────────┬──────────────┘
 *                            ▼
 *              ┌──────────────────────────────┐
 *              │      Fetch Fresh Data        │
 *              └──────────────┬───────────────┘
 *                             │
 *              ┌──────────────┴───────────────┐
 *              ▼                              ▼
 *     ┌────────────────┐            ┌────────────────┐
 *     │    Success     │            │     Error      │
 *     │ isLoading:false│            │ error: string  │
 *     │ data: {...}    │            │ isLoading:false│
 *     └────────────────┘            └────────────────┘
 * ```
 *
 * ## Refresh Flow
 *
 * ```
 * User clicks Refresh
 *         │
 *         ▼
 * ┌─────────────────────┐
 * │ isRefreshing: true  │
 * │ Keep showing data   │
 * └──────────┬──────────┘
 *            │
 *            ▼
 * ┌─────────────────────┐
 * │ refreshContributions│
 * └──────────┬──────────┘
 *            │
 *            ▼
 * ┌─────────────────────┐
 * │ isRefreshing: false │
 * │ Update data         │
 * └─────────────────────┘
 * ```
 *
 * @module useContributions
 */

import { useState, useEffect, useCallback } from "react";
import type { ContributionData } from "../lib/types";
import {
  fetchContributions,
  getCachedContributions,
  refreshContributions,
} from "../lib/api";

/**
 * Return type for the useContributions hook.
 *
 * Provides all state and actions needed for contribution data management.
 */
interface UseContributionsReturn {
  /** The fetched contribution data, or null if not yet loaded */
  data: ContributionData | null;

  /** True during initial data fetch */
  isLoading: boolean;

  /** True during manual refresh (data remains visible) */
  isRefreshing: boolean;

  /** Error message if fetch failed, null otherwise */
  error: string | null;

  /** Function to manually refresh contribution data */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing GitHub contribution data.
 *
 * This hook handles:
 * - Initial data fetch when username changes
 * - Caching strategy (show cached, then fresh)
 * - Manual refresh functionality
 * - Loading and error states
 *
 * ## Usage Example
 *
 * ```tsx
 * function ContributionDisplay() {
 *   const { data, isLoading, isRefreshing, error, refresh } =
 *     useContributions("octocat");
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!data) return <EmptyState />;
 *
 *   return (
 *     <div>
 *       <Heatmap weeks={data.weeks} />
 *       <Stats stats={data.stats} />
 *       <button onClick={refresh} disabled={isRefreshing}>
 *         {isRefreshing ? "Refreshing..." : "Refresh"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Caching Behavior
 *
 * The hook implements a "stale-while-revalidate" strategy:
 * 1. Immediately show cached data if available
 * 2. Fetch fresh data in the background
 * 3. Update display when fresh data arrives
 *
 * @param username - GitHub username to fetch contributions for
 * @returns Object containing data, loading states, error, and refresh function
 */
export function useContributions(username: string): UseContributionsReturn {
  // State for contribution data
  const [data, setData] = useState<ContributionData | null>(null);

  // Loading state for initial fetch
  const [isLoading, setIsLoading] = useState(true);

  // Separate loading state for manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Initial fetch effect - runs when username changes
  useEffect(() => {
    // Skip if no username provided
    if (!username) {
      setIsLoading(false);
      return;
    }

    // Cancellation flag for cleanup
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Try to get cached data for immediate display
        const cached = await getCachedContributions();
        if (cached && !cancelled) {
          setData(cached);
        }

        // Step 2: Fetch fresh data from GitHub
        const fresh = await fetchContributions(username);
        if (!cancelled) {
          setData(fresh);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    // Skip if no username or already refreshing
    if (!username || isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const fresh = await refreshContributions();
      setData(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  }, [username, isRefreshing]);

  return { data, isLoading, isRefreshing, error, refresh };
}
