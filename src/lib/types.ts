/**
 * # Type Definitions
 *
 * This module contains all TypeScript interfaces used throughout the frontend.
 * These types mirror the Rust backend types and are used for type-safe IPC communication.
 *
 * ## Type Hierarchy
 *
 * ```
 * ContributionData
 * ├── user: UserInfo
 * │   ├── username: string
 * │   └── avatarUrl: string
 * │
 * ├── weeks: ContributionWeek[]
 * │   └── days: ContributionDay[]
 * │       ├── date: string (YYYY-MM-DD)
 * │       ├── count: number
 * │       └── level: 0 | 1 | 2 | 3 | 4
 * │
 * ├── stats: ContributionStats
 * │   ├── totalContributions: number
 * │   ├── bestDay: BestDay
 * │   ├── averagePerDay: number
 * │   ├── currentStreak: Streak
 * │   └── longestStreak: Streak
 * │
 * └── lastUpdated: string (ISO 8601)
 * ```
 *
 * ## Data Flow
 *
 * ```
 * Rust Backend                    TypeScript Frontend
 * ─────────────────────────────────────────────────────
 * ContributionData  ──IPC──▶  ContributionData
 * Settings          ──IPC──▶  Settings
 * ```
 *
 * @module types
 */

// ============================================================================
// Contribution Day
// ============================================================================

/**
 * Represents a single day's contribution data.
 *
 * Each cell in the contribution heatmap corresponds to one ContributionDay.
 * The level determines the cell's color intensity.
 *
 * ## Level Colors
 *
 * ```
 * Level 0: #161b22 (no contributions - dark gray)
 * Level 1: #0e4429 (low - darkest green)
 * Level 2: #006d32 (medium-low)
 * Level 3: #26a641 (medium-high)
 * Level 4: #39d353 (high - brightest green)
 * ```
 *
 * @example
 * ```ts
 * const day: ContributionDay = {
 *   date: "2024-12-17",
 *   count: 5,
 *   level: 2
 * };
 * ```
 */
export interface ContributionDay {
  /** Date in YYYY-MM-DD format (e.g., "2024-12-17") */
  date: string;

  /** Number of contributions made on this day */
  count: number;

  /** Visual intensity level for heatmap coloring (0 = none, 4 = highest) */
  level: 0 | 1 | 2 | 3 | 4;
}

// ============================================================================
// Contribution Week
// ============================================================================

/**
 * A week's worth of contribution data.
 *
 * Weeks run Sunday to Saturday, matching GitHub's calendar layout.
 * Each week is rendered as a column in the heatmap.
 *
 * ## Heatmap Layout
 *
 * ```
 *        Week1  Week2  Week3  Week4  ...
 * Sun    [  ]   [  ]   [  ]   [  ]
 * Mon    [  ]   [██]   [  ]   [▓▓]
 * Tue    [▒▒]   [██]   [▓▓]   [██]
 * Wed    [██]   [  ]   [██]   [  ]
 * Thu    [▓▓]   [▒▒]   [▓▓]   [██]
 * Fri    [  ]   [██]   [  ]   [▓▓]
 * Sat    [▒▒]   [  ]   [▒▒]   [  ]
 * ```
 *
 * @example
 * ```ts
 * const week: ContributionWeek = {
 *   days: [
 *     { date: "2024-12-15", count: 0, level: 0 }, // Sunday
 *     { date: "2024-12-16", count: 3, level: 2 }, // Monday
 *     // ... up to 7 days
 *   ]
 * };
 * ```
 */
export interface ContributionWeek {
  /** Days in this week (typically 7, may be fewer for partial weeks) */
  days: ContributionDay[];
}

// ============================================================================
// Best Day
// ============================================================================

/**
 * Represents the day with the most contributions.
 *
 * Displayed in the statistics grid as a highlight achievement.
 *
 * @example
 * ```ts
 * const bestDay: BestDay = {
 *   date: "2024-06-15",
 *   count: 47  // Personal record!
 * };
 * ```
 */
export interface BestDay {
  /** Date of the best contribution day (YYYY-MM-DD) */
  date: string;

  /** Number of contributions on the best day */
  count: number;
}

// ============================================================================
// Streak
// ============================================================================

/**
 * Represents a streak of consecutive contribution days.
 *
 * Two types of streaks are tracked:
 * - **Current Streak**: Consecutive days ending today or yesterday
 * - **Longest Streak**: Best streak ever achieved
 *
 * ## Streak Example
 *
 * ```
 * Dec 10  Dec 11  Dec 12  Dec 13  Dec 14  Dec 15  Dec 16  Dec 17
 *   3       5       2       0       4       6       3       2
 *   └───────────────┘       └───────────────────────────────┘
 *      3-day streak              Current: 4-day streak
 *                                (if today is Dec 17)
 * ```
 *
 * @example
 * ```ts
 * const streak: Streak = {
 *   count: 14,
 *   startDate: "2024-12-04",
 *   endDate: "2024-12-17"
 * };
 * ```
 */
export interface Streak {
  /** Number of consecutive days in the streak */
  count: number;

  /** First day of the streak (YYYY-MM-DD) */
  startDate: string;

  /** Last day of the streak (YYYY-MM-DD) */
  endDate: string;
}

// ============================================================================
// Contribution Statistics
// ============================================================================

/**
 * Aggregated statistics from contribution data.
 *
 * Displayed in the statistics grid at the bottom of the popup.
 *
 * ## Statistics Display
 *
 * ```
 * ┌─────────────────┬─────────────────┐
 * │ 📊 TOTAL        │ ⭐ BEST DAY     │
 * │     1,247       │      47         │
 * │                 │   Jun 15        │
 * ├─────────────────┼─────────────────┤
 * │ 🔥 LONGEST      │ 📅 CURRENT      │
 * │    42 days      │    14 days      │
 * │ May 1 - Jun 11  │ Dec 4 - Dec 17  │
 * └─────────────────┴─────────────────┘
 * ```
 */
export interface ContributionStats {
  /** Total contributions in the period (usually 1 year) */
  totalContributions: number;

  /** Day with the highest contribution count */
  bestDay: BestDay;

  /** Average contributions per day */
  averagePerDay: number;

  /** Currently active streak (ends today or yesterday) */
  currentStreak: Streak;

  /** Longest streak ever achieved */
  longestStreak: Streak;
}

// ============================================================================
// User Info
// ============================================================================

/**
 * Basic GitHub user information.
 *
 * Displayed in the header of the popup window.
 *
 * ## Header Display
 *
 * ```
 * ┌────────────────────────────────┐
 * │ [Avatar]  username             │
 * │           @username            │
 * └────────────────────────────────┘
 * ```
 *
 * @example
 * ```ts
 * const user: UserInfo = {
 *   username: "octocat",
 *   avatarUrl: "https://github.com/octocat.png?size=80"
 * };
 * ```
 */
export interface UserInfo {
  /** GitHub username */
  username: string;

  /** URL to the user's avatar image */
  avatarUrl: string;
}

// ============================================================================
// Contribution Data
// ============================================================================

/**
 * Complete contribution data returned from the backend.
 *
 * This is the main data structure used to render the entire popup UI.
 * It's fetched via IPC from the Rust backend.
 *
 * ## Component Mapping
 *
 * ```
 * ContributionData
 *       │
 *       ├── user ──────────▶ UserHeader component
 *       │
 *       ├── weeks ─────────▶ Heatmap component
 *       │
 *       ├── stats ─────────▶ StatCard components (x4)
 *       │
 *       └── lastUpdated ───▶ Footer timestamp
 * ```
 *
 * @example
 * ```ts
 * const data = await invoke<ContributionData>("fetch_contributions", {
 *   username: "octocat"
 * });
 *
 * console.log(`Total: ${data.stats.totalContributions}`);
 * console.log(`Current streak: ${data.stats.currentStreak.count} days`);
 * ```
 */
export interface ContributionData {
  /** User information for header display */
  user: UserInfo;

  /** Weeks of contribution data for heatmap rendering */
  weeks: ContributionWeek[];

  /** Calculated statistics for stats cards */
  stats: ContributionStats;

  /** ISO 8601 timestamp of when data was fetched */
  lastUpdated: string;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Application settings stored persistently.
 *
 * Settings are saved to disk and restored on app launch.
 *
 * ## Settings Panel
 *
 * ```
 * ┌────────────────────────────────────────┐
 * │ Settings                               │
 * ├────────────────────────────────────────┤
 * │ GITHUB USERNAME                        │
 * │ ┌────────────────────────┐ ┌────────┐ │
 * │ │ octocat                │ │  Save  │ │
 * │ └────────────────────────┘ └────────┘ │
 * │                                        │
 * │ THEME                                  │
 * │ ┌──────────┬──────────┬──────────┐    │
 * │ │ System   │  Light   │  Dark    │    │
 * │ └──────────┴──────────┴──────────┘    │
 * │                                        │
 * │ STARTUP                                │
 * │ ┌────────────────────────────────┐    │
 * │ │ Launch at Login          [ON] │    │
 * │ └────────────────────────────────┘    │
 * └────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```ts
 * const settings: Settings = {
 *   username: "octocat",
 *   updateInterval: 3600,
 *   iconStyle: "green",
 *   launchAtLogin: true,
 *   theme: "dark"
 * };
 * ```
 */
export interface Settings {
  /** GitHub username to track */
  username: string;

  /** Auto-refresh interval in seconds (default: 3600 = 1 hour) */
  updateInterval: number;

  /** Tray icon style: "monochrome" or "green" */
  iconStyle: "monochrome" | "green";

  /** Whether to launch the app at system startup */
  launchAtLogin: boolean;

  /** UI theme preference */
  theme: "system" | "light" | "dark";
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Error response from the backend API.
 *
 * Used for typed error handling in IPC calls.
 *
 * @example
 * ```ts
 * try {
 *   await fetchContributions("invalid-user");
 * } catch (error) {
 *   const apiError = error as ApiError;
 *   console.error(apiError.message);
 * }
 * ```
 */
export interface ApiError {
  /** Human-readable error message */
  message: string;

  /** Optional error code for programmatic handling */
  code?: string;
}

/**
 * Generic result type for API responses.
 *
 * Provides type-safe success/error handling.
 *
 * @example
 * ```ts
 * function handleResult(result: ApiResult<ContributionData>) {
 *   if (result.ok) {
 *     console.log(result.data.stats.totalContributions);
 *   } else {
 *     console.error(result.error.message);
 *   }
 * }
 * ```
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
