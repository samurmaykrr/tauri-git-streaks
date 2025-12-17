/**
 * # StatCard Component
 *
 * Reusable statistics card for displaying contribution metrics.
 *
 * ## Visual Layout
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │  [icon] LABEL                       │  ◄── Uppercase label with icon
 * │                                     │
 * │  1,234                              │  ◄── Large value (monospace)
 * │                                     │
 * │  Dec 15, 2024                       │  ◄── Optional sublabel
 * └─────────────────────────────────────┘
 * ```
 *
 * ## Variant Styles
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │ Default Variant                     │
 * │                                     │
 * │ Value: var(--text-primary)          │  ◄── Standard white/black
 * └─────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────┐
 * │ Highlight Variant                   │
 * │                                     │
 * │ Value: var(--accent-green)          │  ◄── GitHub green highlight
 * └─────────────────────────────────────┘
 * ```
 *
 * ## Usage in Grid
 *
 * ```
 * ┌────────────────┬────────────────┐
 * │   [chart]      │    [star]      │
 * │   TOTAL        │    BEST DAY    │
 * │   1,234        │    42          │
 * │                │    Dec 15      │
 * ├────────────────┼────────────────┤
 * │   [fire]       │  [calendar]    │
 * │   LONGEST      │    CURRENT     │
 * │   45 days      │    12 days     │  ◄── highlight variant
 * │   Jan-Mar      │    Dec 1-12    │
 * └────────────────┴────────────────┘
 * ```
 *
 * @module StatCard
 */

import type { ReactNode } from "react";

/**
 * Props for the StatCard component.
 */
interface StatCardProps {
  /** Label text displayed at top (e.g., "Total", "Best Day") */
  label: string;

  /** Primary value to display (number or formatted string) */
  value: string | number;

  /** Optional secondary text below value (e.g., date range) */
  sublabel?: string;

  /** Optional icon displayed before label */
  icon?: ReactNode;

  /** Visual variant - "highlight" uses accent green for value */
  variant?: "default" | "highlight";
}

/**
 * Statistics card component for displaying contribution metrics.
 *
 * Used in the stats grid to show:
 * - Total contributions
 * - Best contribution day
 * - Longest streak
 * - Current streak
 *
 * ## Features
 *
 * - **Monospace Numbers**: Values use tabular-nums for alignment
 * - **Icon Support**: Optional icon before label
 * - **Highlight Variant**: Green accent for streak values
 * - **Sublabel**: Secondary info like date ranges
 *
 * @param props - Component props
 * @returns Rendered stat card
 *
 * @example
 * ```tsx
 * // Basic stat
 * <StatCard
 *   label="Total"
 *   value={1234}
 *   icon={<ChartIcon />}
 * />
 *
 * // Highlighted streak with date range
 * <StatCard
 *   label="Current"
 *   value="12 days"
 *   sublabel="Dec 1 - Dec 12"
 *   icon={<FireIcon />}
 *   variant="highlight"
 * />
 * ```
 */
export function StatCard({
  label,
  value,
  sublabel,
  icon,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className="p-2 rounded-md"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-muted)",
      }}
    >
      {/* Label row with optional icon */}
      <div
        className="flex items-center gap-1 text-xs uppercase tracking-wide mb-0.5"
        style={{ color: "var(--text-tertiary)", fontSize: '10px' }}
      >
        {icon}
        {label}
      </div>

      {/* Primary value - large monospace number */}
      <div
        className="font-semibold"
        style={{
          color: variant === "highlight" ? "var(--accent-green)" : "var(--text-primary)",
          fontFamily: "ui-monospace, monospace",
          fontSize: '18px',
          fontVariantNumeric: 'tabular-nums', // Aligns numbers in columns
        }}
      >
        {value}
      </div>

      {/* Optional sublabel (date range, etc.) */}
      {sublabel && (
        <div
          className="mt-0.5"
          style={{ 
            color: "var(--text-secondary)", 
            fontFamily: "monospace",
            fontSize: '10px',
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
