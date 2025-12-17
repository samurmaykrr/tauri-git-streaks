/**
 * # HeatmapTooltip Component
 *
 * Floating tooltip that displays contribution details when hovering over heatmap cells.
 *
 * ## Visual Layout
 *
 * ```
 *                     ┌─────────────────────┐
 *                     │  5 contributions    │
 *                     │  Dec 15, 2024       │
 *                     └──────────┬──────────┘
 *                                │
 *                                ▼
 *                            ┌──────┐
 *                            │ Cell │  ◄── Hovered cell
 *                            └──────┘
 * ```
 *
 * ## Edge Detection Logic
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                    Window Viewport                       │
 * │                                                          │
 * │  8px │                                            │ 8px  │
 * │ ◄───►│  Safe zone for tooltip positioning        │◄───► │
 * │      │                                            │      │
 * │      │    ┌────────────┐                          │      │
 * │      │    │  Tooltip   │  ◄── Adjusted position   │      │
 * │      │    └─────┬──────┘      if near edge        │      │
 * │      │          │                                 │      │
 * │      │          ▼                                 │      │
 * │      │      ┌──────┐                              │      │
 * │      │      │ Cell │                              │      │
 * │      │      └──────┘                              │      │
 * │                                                          │
 * └──────────────────────────────────────────────────────────┘
 *
 * Position Adjustments:
 * - Too far left:  newX = halfWidth + 8px
 * - Too far right: newX = windowWidth - halfWidth - 8px
 * - Too high:      Show below cell instead of above
 * ```
 *
 * ## Positioning Flow
 *
 * ```
 * Initial Position (x, y)
 *         │
 *         ▼
 * ┌───────────────────────┐
 * │ Measure tooltip size  │
 * └───────────┬───────────┘
 *             │
 *             ▼
 * ┌───────────────────────┐
 * │ Check left boundary   │──▶ Adjust if x - halfWidth < 8
 * └───────────┬───────────┘
 *             │
 *             ▼
 * ┌───────────────────────┐
 * │ Check right boundary  │──▶ Adjust if x + halfWidth > width - 8
 * └───────────┬───────────┘
 *             │
 *             ▼
 * ┌───────────────────────┐
 * │ Check top boundary    │──▶ Flip below if tooltip goes above viewport
 * └───────────┬───────────┘
 *             │
 *             ▼
 *     Set adjusted position
 * ```
 *
 * @module HeatmapTooltip
 */

import { useEffect, useRef, useState } from "react";
import type { ContributionDay } from "../../lib/types";
import { formatDate } from "../../lib/utils";

/**
 * Props for the HeatmapTooltip component.
 */
interface HeatmapTooltipProps {
  /** The contribution day data to display */
  day: ContributionDay;

  /** X coordinate (center of hovered cell) */
  x: number;

  /** Y coordinate (top of hovered cell) */
  y: number;
}

/**
 * Floating tooltip component for heatmap cell details.
 *
 * Displays contribution count and date for a hovered cell,
 * with smart positioning to stay within viewport bounds.
 *
 * ## Features
 *
 * - **Edge Detection**: Automatically adjusts position near viewport edges
 * - **Smart Flipping**: Shows below cell if not enough space above
 * - **Contribution Text**: Grammatically correct singular/plural text
 * - **Formatted Date**: Human-readable date format
 *
 * @param props - Component props with day data and position
 * @returns Rendered tooltip component
 *
 * @example
 * ```tsx
 * {tooltipData && (
 *   <HeatmapTooltip
 *     day={tooltipData.day}
 *     x={tooltipData.x}
 *     y={tooltipData.y}
 *   />
 * )}
 * ```
 */
export function HeatmapTooltip({ day, x, y }: HeatmapTooltipProps) {
  // Ref to measure tooltip dimensions
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Adjusted position after edge detection
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Generate grammatically correct contribution text
  const contributionText =
    day.count === 0
      ? "No contributions"
      : day.count === 1
        ? "1 contribution"
        : `${day.count} contributions`;

  /**
   * Edge detection effect.
   *
   * Runs after render to measure tooltip size and adjust
   * position to keep it within viewport bounds.
   */
  useEffect(() => {
    if (tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      
      let newX = x;
      let newY = y;
      
      // Calculate half-width for centering
      const tooltipWidth = rect.width;
      const halfWidth = tooltipWidth / 2;
      
      // Adjust horizontal position if tooltip goes off screen
      if (x - halfWidth < 8) {
        // Too far left - push right
        newX = halfWidth + 8;
      } else if (x + halfWidth > windowWidth - 8) {
        // Too far right - push left
        newX = windowWidth - halfWidth - 8;
      }
      
      // Adjust vertical position if tooltip goes off top
      const tooltipHeight = rect.height;
      if (y - tooltipHeight - 12 < 0) {
        // Not enough space above - show below cell
        newY = y + 24;
      }
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  return (
    <div
      ref={tooltipRef}
      className="tooltip"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Contribution count - primary info */}
      <div className="font-medium" style={{ color: "var(--text-primary)" }}>
        {contributionText}
      </div>

      {/* Date - secondary info */}
      <div style={{ color: "var(--text-secondary)", fontSize: '11px' }}>
        {formatDate(day.date)}
      </div>
    </div>
  );
}
