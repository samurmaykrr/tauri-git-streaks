/**
 * # Utility Functions
 *
 * This module provides helper functions for formatting, date manipulation,
 * and other common operations used throughout the frontend.
 *
 * ## Function Categories
 *
 * ```
 * Utilities
 * ├── Date Formatting
 * │   ├── formatDate()         - "Dec 17"
 * │   ├── formatDateRange()    - "Dec 4 - Dec 17"
 * │   └── formatRelativeTime() - "5m ago", "2h ago"
 * │
 * ├── Display Formatting
 * │   ├── formatStreak()       - "14 days"
 * │   └── getContribLevelClass() - CSS class for level
 * │
 * ├── Data Helpers
 * │   ├── getMonthLabels()     - Extract month labels from weeks
 * │   └── hasContributedToday() - Check today's activity
 * │
 * └── Utilities
 *     └── cn()                 - Classname concatenation
 * ```
 *
 * @module utils
 */

import type { ContributionDay, Streak } from "./types";

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Formats a date string for compact display.
 *
 * Converts ISO date strings to human-readable format.
 *
 * ## Format Examples
 *
 * ```
 * "2024-12-17" ──▶ "Dec 17"
 * "2024-01-01" ──▶ "Jan 1"
 * "2024-06-15" ──▶ "Jun 15"
 * ```
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Dec 17")
 *
 * @example
 * ```ts
 * formatDate("2024-12-17"); // "Dec 17"
 * formatDate("2024-01-01"); // "Jan 1"
 * ```
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Formats a date range for display.
 *
 * Used for showing streak periods.
 *
 * ## Format Example
 *
 * ```
 * "2024-12-04", "2024-12-17" ──▶ "Dec 4 - Dec 17"
 * ```
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Formatted range string (e.g., "Dec 4 - Dec 17")
 *
 * @example
 * ```ts
 * formatDateRange("2024-12-04", "2024-12-17"); // "Dec 4 - Dec 17"
 * ```
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Formats a streak for display.
 *
 * Handles singular/plural and zero cases.
 *
 * ## Format Examples
 *
 * ```
 * { count: 0 }  ──▶ "No streak"
 * { count: 1 }  ──▶ "1 day"
 * { count: 14 } ──▶ "14 days"
 * ```
 *
 * @param streak - Streak object with count property
 * @returns Human-readable streak string
 *
 * @example
 * ```ts
 * formatStreak({ count: 14, startDate: "...", endDate: "..." }); // "14 days"
 * formatStreak({ count: 1, startDate: "...", endDate: "..." });  // "1 day"
 * formatStreak({ count: 0, startDate: "", endDate: "" });        // "No streak"
 * ```
 */
export function formatStreak(streak: Streak): string {
  if (streak.count === 0) return "No streak";
  if (streak.count === 1) return "1 day";
  return `${streak.count} days`;
}

/**
 * Formats a timestamp as relative time.
 *
 * Converts ISO timestamps to human-friendly relative times.
 *
 * ## Format Examples
 *
 * ```
 * Just now     ──▶ "just now"    (< 60 seconds)
 * Minutes ago  ──▶ "5m ago"      (< 60 minutes)
 * Hours ago    ──▶ "2h ago"      (< 24 hours)
 * Days ago     ──▶ "3d ago"      (≥ 24 hours)
 * ```
 *
 * @param dateStr - ISO 8601 timestamp string
 * @returns Human-readable relative time (e.g., "5m ago")
 *
 * @example
 * ```ts
 * // If current time is 2024-12-17T12:00:00Z
 * formatRelativeTime("2024-12-17T11:55:00Z"); // "5m ago"
 * formatRelativeTime("2024-12-17T10:00:00Z"); // "2h ago"
 * formatRelativeTime("2024-12-15T12:00:00Z"); // "2d ago"
 * ```
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Gets the CSS class for a contribution level.
 *
 * Maps contribution intensity levels to Tailwind CSS classes
 * that use CSS custom properties for theming.
 *
 * ## Level to Color Mapping
 *
 * ```
 * Level 0 ──▶ bg-[var(--color-contrib-0)] ──▶ #161b22 (no activity)
 * Level 1 ──▶ bg-[var(--color-contrib-1)] ──▶ #0e4429 (low)
 * Level 2 ──▶ bg-[var(--color-contrib-2)] ──▶ #006d32 (medium-low)
 * Level 3 ──▶ bg-[var(--color-contrib-3)] ──▶ #26a641 (medium-high)
 * Level 4 ──▶ bg-[var(--color-contrib-4)] ──▶ #39d353 (high)
 * ```
 *
 * @param level - Contribution intensity level (0-4)
 * @returns Tailwind CSS class string
 *
 * @example
 * ```tsx
 * <div className={getContribLevelClass(day.level)} />
 * ```
 */
export function getContribLevelClass(level: 0 | 1 | 2 | 3 | 4): string {
  const classes = {
    0: "bg-[var(--color-contrib-0)]",
    1: "bg-[var(--color-contrib-1)]",
    2: "bg-[var(--color-contrib-2)]",
    3: "bg-[var(--color-contrib-3)]",
    4: "bg-[var(--color-contrib-4)]",
  };
  return classes[level];
}

// ============================================================================
// Data Helpers
// ============================================================================

/**
 * Extracts month labels and their positions from weeks data.
 *
 * Used to render month labels above the contribution heatmap.
 * A new label is added whenever the month changes.
 *
 * ## Month Label Extraction
 *
 * ```
 * Weeks:  [Week1] [Week2] [Week3] [Week4] [Week5] [Week6] ...
 * Months:  Nov     Nov     Nov     Dec     Dec     Dec
 *          ↑                       ↑
 *       Label at 0            Label at 3
 *
 * Result: [{ label: "Nov", index: 0 }, { label: "Dec", index: 3 }]
 * ```
 *
 * @param weeks - Array of contribution weeks
 * @returns Array of month labels with their week indices
 *
 * @example
 * ```ts
 * const labels = getMonthLabels(data.weeks);
 * // [{ label: "Nov", index: 0 }, { label: "Dec", index: 4 }, ...]
 * ```
 */
export function getMonthLabels(
  weeks: { days: ContributionDay[] }[]
): { label: string; index: number }[] {
  const months: { label: string; index: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.days[0];
    if (firstDay) {
      const date = new Date(firstDay.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        months.push({
          label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(
            date
          ),
          index: weekIndex,
        });
        lastMonth = month;
      }
    }
  });

  return months;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Concatenates class names, filtering out falsy values.
 *
 * A minimal alternative to libraries like clsx or classnames.
 *
 * ## Usage Examples
 *
 * ```
 * cn("foo", "bar")           ──▶ "foo bar"
 * cn("foo", false, "bar")    ──▶ "foo bar"
 * cn("foo", null, undefined) ──▶ "foo"
 * cn(isActive && "active")   ──▶ "active" or ""
 * ```
 *
 * @param classes - Class names (strings, booleans, null, or undefined)
 * @returns Space-separated class string
 *
 * @example
 * ```tsx
 * <div className={cn(
 *   "base-class",
 *   isActive && "active",
 *   isDisabled && "disabled"
 * )} />
 * ```
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Checks if the user has made contributions today.
 *
 * Used for tray icon status and streak indicators.
 *
 * ## Check Logic
 *
 * ```
 * Today = 2024-12-17
 *
 * Last Week Days:
 * [Dec 15, Dec 16, Dec 17]
 *                    ↑
 *              Check this day
 *
 * If Dec 17 has count > 0 ──▶ true
 * Otherwise ──▶ false
 * ```
 *
 * @param weeks - Array of contribution weeks
 * @returns true if today has at least one contribution
 *
 * @example
 * ```ts
 * if (hasContributedToday(data.weeks)) {
 *   showGreenTrayIcon();
 * } else {
 *   showGrayTrayIcon();
 * }
 * ```
 */
export function hasContributedToday(
  weeks: { days: ContributionDay[] }[]
): boolean {
  const today = new Date().toISOString().split("T")[0];
  const lastWeek = weeks[weeks.length - 1];
  if (!lastWeek) return false;

  const todayData = lastWeek.days.find((d) => d.date === today);
  return todayData ? todayData.count > 0 : false;
}
