/**
 * # API Module
 *
 * This module provides typed wrappers around Tauri IPC commands.
 * All communication with the Rust backend goes through these functions.
 *
 * ## IPC Architecture
 *
 * ```
 * React Frontend                 Tauri IPC                 Rust Backend
 * ──────────────────────────────────────────────────────────────────────
 *
 * api.ts                         invoke()                  lib.rs
 * ┌─────────────────┐           ┌────────┐           ┌─────────────────┐
 * │fetchContributions├──────────▶│        │──────────▶│fetch_contributions
 * │getCachedContribs │◀──────────┤ Bridge │◀──────────┤get_cached_contribs
 * │getSettings       │──────────▶│        │──────────▶│get_settings
 * │saveSettings      │◀──────────┤        │◀──────────┤save_settings
 * │refreshContribs   │──────────▶│        │──────────▶│refresh_contributions
 * └─────────────────┘           └────────┘           └─────────────────┘
 * ```
 *
 * ## Error Handling
 *
 * All functions can throw errors from the Rust backend.
 * Errors are typically strings describing what went wrong.
 *
 * ```ts
 * try {
 *   const data = await fetchContributions("invalid-user");
 * } catch (error) {
 *   // error is typically a string from Rust
 *   console.error("Failed:", error);
 * }
 * ```
 *
 * @module api
 */

import { invoke } from "@tauri-apps/api/core";
import type { ContributionData, Settings } from "./types";

// ============================================================================
// Contribution API
// ============================================================================

/**
 * Fetches GitHub contribution data for a specified user.
 *
 * This makes an HTTP request to GitHub's contribution endpoint,
 * parses the HTML response, and calculates statistics.
 *
 * ## Request Flow
 *
 * ```
 * fetchContributions("octocat")
 *         │
 *         ▼
 * ┌───────────────────────────────────────┐
 * │ invoke("fetch_contributions")         │
 * │ username: "octocat"                   │
 * └───────────────────────────────────────┘
 *         │
 *         ▼ (Rust backend)
 * ┌───────────────────────────────────────┐
 * │ 1. Fetch GitHub HTML                  │
 * │ 2. Parse contribution data            │
 * │ 3. Calculate statistics               │
 * │ 4. Cache result                       │
 * │ 5. Return ContributionData            │
 * └───────────────────────────────────────┘
 * ```
 *
 * @param username - The GitHub username to fetch contributions for
 * @returns Promise resolving to complete contribution data
 * @throws Error if the user doesn't exist or network request fails
 *
 * @example
 * ```ts
 * const data = await fetchContributions("octocat");
 * console.log(`Total: ${data.stats.totalContributions}`);
 * console.log(`Current streak: ${data.stats.currentStreak.count} days`);
 * ```
 */
export async function fetchContributions(
  username: string
): Promise<ContributionData> {
  return invoke<ContributionData>("fetch_contributions", { username });
}

/**
 * Retrieves cached contribution data if available.
 *
 * This provides instant access to previously fetched data while
 * fresh data is being loaded in the background.
 *
 * ## Caching Strategy
 *
 * ```
 * App Opens
 *     │
 *     ├──▶ getCachedContributions() ──▶ Show cached data immediately
 *     │
 *     └──▶ fetchContributions() ──────▶ Update with fresh data
 * ```
 *
 * @returns Promise resolving to cached data, or null if none exists
 *
 * @example
 * ```ts
 * // Show cached data immediately
 * const cached = await getCachedContributions();
 * if (cached) {
 *   setData(cached);
 * }
 *
 * // Then fetch fresh data
 * const fresh = await fetchContributions(username);
 * setData(fresh);
 * ```
 */
export async function getCachedContributions(): Promise<ContributionData | null> {
  return invoke<ContributionData | null>("get_cached_contributions");
}

/**
 * Refreshes contribution data for the currently stored username.
 *
 * Use this for manual refresh operations after the initial fetch.
 * The username is stored in memory from the last `fetchContributions` call.
 *
 * @returns Promise resolving to fresh contribution data
 * @throws Error if no username has been set or fetch fails
 *
 * @example
 * ```ts
 * // User clicks refresh button
 * const handleRefresh = async () => {
 *   setIsRefreshing(true);
 *   try {
 *     const fresh = await refreshContributions();
 *     setData(fresh);
 *   } finally {
 *     setIsRefreshing(false);
 *   }
 * };
 * ```
 */
export async function refreshContributions(): Promise<ContributionData> {
  return invoke<ContributionData>("refresh_contributions");
}

// ============================================================================
// Settings API
// ============================================================================

/**
 * Retrieves current application settings.
 *
 * Settings include username, theme preference, and autostart configuration.
 * Returns default values if no settings have been saved yet.
 *
 * ## Default Settings
 *
 * ```
 * {
 *   username: "",           // Empty triggers welcome screen
 *   updateInterval: 3600,   // 1 hour
 *   iconStyle: "green",
 *   launchAtLogin: false,
 *   theme: "system"
 * }
 * ```
 *
 * @returns Promise resolving to current settings
 *
 * @example
 * ```ts
 * const settings = await getSettings();
 * if (!settings.username) {
 *   showWelcomeScreen();
 * }
 * ```
 */
export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/**
 * Saves application settings to persistent storage.
 *
 * This also updates:
 * - In-memory username for refresh operations
 * - System autostart configuration
 *
 * ## Settings Storage Locations
 *
 * ```
 * macOS:   ~/Library/Application Support/com.gitstreaks.desktop/
 * Windows: %APPDATA%/com.gitstreaks.desktop/
 * Linux:   ~/.config/com.gitstreaks.desktop/
 * ```
 *
 * @param settings - The settings to save
 * @returns Promise that resolves when settings are saved
 * @throws Error if settings cannot be saved
 *
 * @example
 * ```ts
 * await saveSettings({
 *   ...currentSettings,
 *   username: "octocat",
 *   theme: "dark",
 *   launchAtLogin: true
 * });
 * ```
 */
export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}
