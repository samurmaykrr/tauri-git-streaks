/**
 * # Heatmap Component
 *
 * GitHub-style contribution heatmap with time range filtering and interactive tooltips.
 *
 * ## Visual Layout
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  [30 Days] [12 Weeks] [Year]                Less ░▒▓█ More      │
 * │                                                                  │
 * │      Jan        Feb        Mar        Apr        May             │
 * │     ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬─ ...     │
 * │ Mon │░░░│▒▒▒│▓▓▓│░░░│▒▒▒│███│░░░│▒▒▒│▓▓▓│░░░│▒▒▒│███│          │
 * │     ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼─ ...     │
 * │ Wed │▒▒▒│███│░░░│▓▓▓│░░░│▒▒▒│███│░░░│▓▓▓│░░░│▒▒▒│███│          │
 * │     ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼─ ...     │
 * │ Fri │░░░│░░░│▒▒▒│░░░│▓▓▓│░░░│▒▒▒│███│░░░│▓▓▓│░░░│▒▒▒│          │
 * │     └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴─ ...     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Legend: ░ = Level 0 (no contributions)
 *         ▒ = Level 1-2 (light contributions)
 *         ▓ = Level 3 (moderate contributions)
 *         █ = Level 4 (high contributions)
 * ```
 *
 * ## Time Range Filtering
 *
 * ```
 * Range     Duration        Cell Size    Typical Use Case
 * ───────────────────────────────────────────────────────
 * days      ~30 days        24px         Detailed recent view
 * weeks     ~12 weeks       16px         Medium-term progress
 * months    Full year       10px         Long-term overview
 * ```
 *
 * ## Data Flow
 *
 * ```
 * ContributionWeek[]
 *        │
 *        ▼
 * ┌────────────────────┐
 * │ filterWeeksByRange │ ◄── TimeRange state
 * └──────────┬─────────┘
 *            │
 *            ▼
 * ┌────────────────────┐
 * │  getMonthLabels    │ ◄── Extract month boundaries
 * └──────────┬─────────┘
 *            │
 *            ▼
 * ┌────────────────────┐
 * │   Render Grid      │ ◄── Dynamic cell sizing
 * └──────────┬─────────┘
 *            │
 *            ▼
 * ┌────────────────────┐
 * │ HeatmapTooltip     │ ◄── On hover
 * └────────────────────┘
 * ```
 *
 * @module Heatmap
 */

import { useState, useRef, useEffect } from "react";
import type { ContributionWeek, ContributionDay } from "../../lib/types";
import { HeatmapTooltip } from "./HeatmapTooltip";

/**
 * Props for the Heatmap component.
 */
interface HeatmapProps {
  /** Array of contribution weeks containing daily data */
  weeks: ContributionWeek[];
}

/**
 * Time range filter options.
 *
 * Controls how much contribution history is displayed:
 * - days: Last 30 days (~4-5 weeks)
 * - weeks: Last 12 weeks (~3 months)
 * - months: Full year of data
 */
type TimeRange = "days" | "weeks" | "months";

/**
 * Maps contribution level (0-4) to CSS class name.
 *
 * Contribution levels follow GitHub's scale:
 * - Level 0: No contributions (lightest)
 * - Level 1: 1-3 contributions
 * - Level 2: 4-6 contributions
 * - Level 3: 7-9 contributions
 * - Level 4: 10+ contributions (darkest)
 *
 * @param level - Contribution level from 0-4
 * @returns CSS class name for styling the cell
 */
function getContribClass(level: number): string {
  const classes: Record<number, string> = {
    0: "contrib-0",
    1: "contrib-1",
    2: "contrib-2",
    3: "contrib-3",
    4: "contrib-4",
  };
  return classes[level] || "contrib-0";
}

/**
 * Extracts month labels and their column positions from weeks data.
 *
 * Scans through weeks to find where each month begins,
 * creating labels at the appropriate horizontal positions.
 *
 * ```
 * Input weeks: [Week1, Week2, Week3, Week4, Week5, ...]
 *                Jan    Jan    Feb    Feb    Feb
 *
 * Output: [
 *   { label: "Jan", index: 0 },  ◄── First week of Jan
 *   { label: "Feb", index: 2 },  ◄── First week of Feb
 * ]
 * ```
 *
 * @param weeks - Array of contribution weeks
 * @returns Array of month labels with their week indices
 */
function getMonthLabels(weeks: ContributionWeek[]): { label: string; index: number }[] {
  const months: { label: string; index: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.days[0];
    if (firstDay) {
      const date = new Date(firstDay.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        months.push({
          label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
          index: weekIndex,
        });
        lastMonth = month;
      }
    }
  });

  return months;
}

/**
 * Filters weeks array based on selected time range.
 *
 * Time range cutoffs:
 * - "days": Shows last 30 days of contributions
 * - "weeks": Shows last 84 days (~12 weeks)
 * - "months": Shows all data (full year)
 *
 * @param weeks - Full array of contribution weeks
 * @param range - Selected time range filter
 * @returns Filtered weeks array
 */
function filterWeeksByRange(weeks: ContributionWeek[], range: TimeRange): ContributionWeek[] {
  const now = new Date();
  let cutoffDate: Date;

  switch (range) {
    case "days":
      // Last 30 days (~4-5 weeks)
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      break;
    case "weeks":
      // Last 12 weeks
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 84);
      break;
    case "months":
    default:
      // All data (full year)
      return weeks;
  }

  return weeks.filter(week => {
    const lastDay = week.days[week.days.length - 1];
    if (!lastDay) return false;
    return new Date(lastDay.date) >= cutoffDate;
  });
}

/**
 * GitHub-style contribution heatmap component.
 *
 * Displays a grid of contribution cells organized by week (columns)
 * and day of week (rows). Supports time range filtering and
 * interactive tooltips on hover.
 *
 * ## Features
 *
 * - **Time Range Selection**: Switch between 30 days, 12 weeks, or full year
 * - **Dynamic Cell Sizing**: Larger cells for shorter time ranges
 * - **Auto-Scroll**: Automatically scrolls to show most recent data
 * - **Interactive Tooltips**: Hover to see contribution details
 * - **Responsive Legend**: Shows contribution level scale
 *
 * @param props - Component props containing weeks data
 * @returns Rendered heatmap component
 *
 * @example
 * ```tsx
 * <Heatmap weeks={contributionData.weeks} />
 * ```
 */
export function Heatmap({ weeks }: HeatmapProps) {
  const [tooltipData, setTooltipData] = useState<{
    day: ContributionDay;
    x: number;
    y: number;
  } | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("months");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredWeeks = filterWeeksByRange(weeks, timeRange);
  const monthLabels = getMonthLabels(filteredWeeks);

  // Scroll to the end (most recent) on mount and when range changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [filteredWeeks]);

  const handleMouseEnter = (
    day: ContributionDay,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  // Dynamic cell size based on time range
  const getCellSize = (range: TimeRange): number => {
    switch (range) {
      case "days":
        return 24; // Biggest cells for 30 days (~5 weeks)
      case "weeks":
        return 16; // Medium cells for 12 weeks
      case "months":
      default:
        return 10; // Original size for full year
    }
  };

  const cellSize = getCellSize(timeRange);
  const cellGap = timeRange === "months" ? 3 : 4;
  const weekWidth = cellSize + cellGap;
  const dayLabelWidth = 24;

  return (
    <div className="relative">
      {/* Time range selector */}
      <div className="flex items-center justify-between mb-2">
        <div 
          className="flex rounded-md overflow-hidden"
          style={{ border: "1px solid var(--border-default)" }}
        >
          {(["days", "weeks", "months"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="px-2 py-1 text-xs capitalize transition-colors"
              style={{
                background: timeRange === range ? "var(--bg-tertiary)" : "transparent",
                color: timeRange === range ? "var(--text-primary)" : "var(--text-secondary)",
                borderRight: range !== "months" ? "1px solid var(--border-default)" : "none",
              }}
            >
              {range === "days" ? "30 Days" : range === "weeks" ? "12 Weeks" : "Year"}
            </button>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-1">
          <span
            className="text-xs mr-1"
            style={{ color: "var(--text-tertiary)", fontSize: '10px' }}
          >
            Less
          </span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={getContribClass(level)}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                borderRadius: '2px',
              }}
            />
          ))}
          <span
            className="text-xs ml-1"
            style={{ color: "var(--text-tertiary)", fontSize: '10px' }}
          >
            More
          </span>
        </div>
      </div>

      {/* Heatmap container */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--bg-elevated) var(--bg-secondary)',
        }}
      >
        <div style={{ minWidth: 'fit-content' }}>
          {/* Month labels row */}
          <div 
            className="flex relative"
            style={{ 
              height: '16px',
              marginLeft: `${dayLabelWidth + 4}px`,
              marginBottom: '2px',
            }}
          >
            {monthLabels.map(({ label, index }, i) => (
              <span
                key={`${label}-${index}-${i}`}
                className="text-xs"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "monospace",
                  fontSize: '10px',
                  position: 'absolute',
                  left: `${index * weekWidth}px`,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid with day labels */}
          <div className="flex">
            {/* Day labels */}
            <div 
              className="flex flex-col flex-shrink-0"
              style={{ 
                gap: `${cellGap}px`, 
                marginRight: '4px', 
                width: `${dayLabelWidth}px` 
              }}
            >
              {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
                <span
                  key={i}
                  className="text-xs"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "monospace",
                    height: `${cellSize}px`,
                    lineHeight: `${cellSize}px`,
                    fontSize: '9px',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex" style={{ gap: `${cellGap}px` }}>
              {filteredWeeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col"
                  style={{ gap: `${cellGap}px` }}
                >
                  {week.days.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`cursor-pointer ${getContribClass(day.level)}`}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        borderRadius: '2px',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => handleMouseEnter(day, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <HeatmapTooltip
          day={tooltipData.day}
          x={tooltipData.x}
          y={tooltipData.y}
        />
      )}
    </div>
  );
}
