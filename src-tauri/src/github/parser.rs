//! # GitHub HTML Parser
//!
//! This module parses GitHub's contribution calendar HTML to extract
//! contribution data and calculate statistics.
//!
//! ## HTML Structure
//!
//! GitHub's contribution calendar is rendered as an SVG with rect elements
//! for each day. Each rect contains data attributes with the contribution info.
//!
//! ```html
//! <svg class="js-calendar-graph-svg">
//!   <g transform="translate(0, 20)">
//!     <!-- Weeks are columns, days are rows -->
//!     <g transform="translate(16, 0)">
//!       <rect class="ContributionCalendar-day"
//!             data-date="2024-01-01"
//!             data-level="2">
//!         <title>5 contributions on January 1, 2024</title>
//!       </rect>
//!     </g>
//!   </g>
//! </svg>
//! ```
//!
//! ## Parsing Strategy
//!
//! We use regex patterns to extract:
//! 1. **Date and Level**: `data-date="YYYY-MM-DD" ... data-level="N"`
//! 2. **Contribution Count**: "X contributions" or "No contributions"
//!
//! If the count isn't available in the HTML, we estimate it from the level.
//!
//! ## Streak Calculation
//!
//! ```text
//! Current Streak:
//! ─────────────────────────────────────────────────────
//! A current streak is a sequence of consecutive days with
//! contributions that ends on TODAY or YESTERDAY.
//!
//! Example (today is Jan 5):
//! Jan 1  Jan 2  Jan 3  Jan 4  Jan 5
//!   3      5      2      1      0    ◀── Current streak = 4 days
//!                                        (Jan 1-4, today has no contribs)
//!
//! Longest Streak:
//! ─────────────────────────────────────────────────────
//! The longest sequence of consecutive days with contributions
//! at any point in the contribution history.
//! ```

use crate::types::{BestDay, ContributionDay, ContributionStats, ContributionWeek, Streak};
use chrono::{Datelike, NaiveDate};
use regex::Regex;

// ============================================================================
// HTML Parsing
// ============================================================================

/// Parses GitHub contribution HTML to extract day-by-day contribution data.
///
/// This function uses regex patterns to extract contribution information
/// from GitHub's HTML response. It handles two parsing passes:
///
/// 1. **First pass**: Extract contribution counts from tooltip text
/// 2. **Second pass**: Extract dates and levels from data attributes
///
/// ## Regex Patterns
///
/// ```text
/// Pattern 1 (date + level):
/// data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"
///            └─────────────────┘                   └─┘
///                   Date                          Level
///
/// Pattern 2 (count from tooltip):
/// data-date="(\d{4}-\d{2}-\d{2})"[^>]*?>(?:[^<]*?(\d+)\s+contribution|No contributions)
///            └─────────────────┘              └──┘
///                   Date                     Count
/// ```
///
/// # Arguments
///
/// * `html` - Raw HTML string from GitHub's contribution endpoint
///
/// # Returns
///
/// * `Ok(Vec<ContributionDay>)` - Sorted list of contribution days
/// * `Err(String)` - Error if regex compilation fails or no data found
///
/// # Example
///
/// ```rust,ignore
/// let html = r#"<rect data-date="2024-01-15" data-level="3"></rect>"#;
/// let days = parse_contribution_html(html)?;
/// assert_eq!(days[0].date, "2024-01-15");
/// assert_eq!(days[0].level, 3);
/// ```
pub fn parse_contribution_html(html: &str) -> Result<Vec<ContributionDay>, String> {
    // Regex to match date and level attributes
    // Pattern: data-date="2024-01-15" ... data-level="3"
    let date_level_re =
        Regex::new(r#"data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)""#)
            .map_err(|e| e.to_string())?;

    // Regex to extract contribution count from tooltips
    // Pattern: "X contributions" or "No contributions"
    let count_re = Regex::new(
        r#"data-date="(\d{4}-\d{2}-\d{2})"[^>]*?>(?:[^<]*?(\d+)\s+contribution|No contributions)"#,
    )
    .map_err(|e| e.to_string())?;

    let mut days: Vec<ContributionDay> = Vec::new();
    let mut count_map: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

    // First pass: Extract counts from tooltips (if available)
    for cap in count_re.captures_iter(html) {
        let date = cap
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
        let count: u32 = cap.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
        count_map.insert(date, count);
    }

    // Second pass: Extract date and level, using count from first pass or estimating
    for cap in date_level_re.captures_iter(html) {
        let date = cap
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
        let level: u8 = cap.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);

        // Use extracted count or estimate from level
        let count = count_map
            .get(&date)
            .copied()
            .unwrap_or_else(|| estimate_count_from_level(level));

        days.push(ContributionDay { date, count, level });
    }

    // Sort by date (chronological order)
    days.sort_by(|a, b| a.date.cmp(&b.date));

    if days.is_empty() {
        return Err("No contribution data found in HTML".to_string());
    }

    Ok(days)
}

/// Estimates contribution count from the visual level.
///
/// When GitHub doesn't provide explicit counts in the HTML,
/// we use the level to estimate. These are rough approximations
/// based on typical GitHub thresholds.
///
/// ## Level Mapping
///
/// ```text
/// Level │ Estimated Count │ Description
/// ──────┼─────────────────┼────────────────
///   0   │       0         │ No activity
///   1   │       1         │ Low activity
///   2   │       3         │ Medium-low
///   3   │       6         │ Medium-high
///   4   │      10         │ High activity
/// ```
///
/// # Arguments
///
/// * `level` - The contribution level (0-4)
///
/// # Returns
///
/// Estimated number of contributions
fn estimate_count_from_level(level: u8) -> u32 {
    match level {
        0 => 0,
        1 => 1,
        2 => 3,
        3 => 6,
        4 => 10,
        _ => 0,
    }
}

// ============================================================================
// Week Grouping
// ============================================================================

/// Groups contribution days into weeks (Sunday-Saturday).
///
/// GitHub's contribution calendar displays weeks as columns,
/// with each column representing a Sunday-Saturday week.
/// This function organizes the flat list of days into this structure.
///
/// ## Week Structure
///
/// ```text
/// Input: [Day1, Day2, Day3, ..., DayN]
///
/// Output:
/// Week 0          Week 1          Week 2
/// ┌─────────┐    ┌─────────┐    ┌─────────┐
/// │ Sun     │    │ Sun     │    │ Sun     │
/// │ Mon     │    │ Mon     │    │ Mon     │
/// │ Tue     │    │ Tue     │    │ Tue     │
/// │ Wed     │    │ Wed     │    │ Wed     │
/// │ Thu     │    │ Thu     │    │ Thu     │
/// │ Fri     │    │ Fri     │    │ Fri     │
/// │ Sat     │    │ Sat     │    │ Sat     │
/// └─────────┘    └─────────┘    └─────────┘
///
/// Note: First/last weeks may be partial
/// ```
///
/// # Arguments
///
/// * `days` - List of contribution days (will be consumed)
///
/// # Returns
///
/// Vector of weeks, each containing up to 7 days
pub fn group_into_weeks(days: Vec<ContributionDay>) -> Vec<ContributionWeek> {
    if days.is_empty() {
        return vec![];
    }

    let mut weeks: Vec<ContributionWeek> = Vec::new();
    let mut current_week: Vec<ContributionDay> = Vec::new();

    for day in days {
        if let Ok(date) = NaiveDate::parse_from_str(&day.date, "%Y-%m-%d") {
            // Get day of week (0 = Sunday, 6 = Saturday)
            let weekday = date.weekday().num_days_from_sunday() as usize;

            // If it's Sunday and we have days accumulated, start a new week
            if weekday == 0 && !current_week.is_empty() {
                weeks.push(ContributionWeek { days: current_week });
                current_week = Vec::new();
            }

            current_week.push(day);
        }
    }

    // Don't forget the final partial week
    if !current_week.is_empty() {
        weeks.push(ContributionWeek { days: current_week });
    }

    weeks
}

// ============================================================================
// Statistics Calculation
// ============================================================================

/// Calculates aggregate statistics from contribution data.
///
/// This function computes:
/// - Total contributions
/// - Best day (highest single-day count)
/// - Average contributions per day
/// - Current streak
/// - Longest streak
///
/// ## Statistics Flow
///
/// ```text
/// Vec<ContributionDay>
///         │
///         ├──▶ sum(count) ──────────────▶ total_contributions
///         │
///         ├──▶ max(count) ──────────────▶ best_day
///         │
///         ├──▶ total / len ─────────────▶ average_per_day
///         │
///         ├──▶ calculate_current_streak ─▶ current_streak
///         │
///         └──▶ calculate_longest_streak ─▶ longest_streak
/// ```
///
/// # Arguments
///
/// * `days` - Slice of contribution days
///
/// # Returns
///
/// Computed statistics
pub fn calculate_stats(days: &[ContributionDay]) -> ContributionStats {
    // Calculate total contributions
    let total_contributions: u32 = days.iter().map(|d| d.count).sum();

    // Find the best day (maximum contributions)
    let best_day = days
        .iter()
        .max_by_key(|d| d.count)
        .map(|d| BestDay {
            date: d.date.clone(),
            count: d.count,
        })
        .unwrap_or(BestDay {
            date: String::new(),
            count: 0,
        });

    // Calculate average per day
    let days_with_data = days.len() as f32;
    let average_per_day = if days_with_data > 0.0 {
        total_contributions as f32 / days_with_data
    } else {
        0.0
    };

    // Calculate streak statistics
    let current_streak = calculate_current_streak(days);
    let longest_streak = calculate_longest_streak(days);

    ContributionStats {
        total_contributions,
        best_day,
        average_per_day,
        current_streak,
        longest_streak,
    }
}

/// Calculates the current active streak.
///
/// A current streak is a sequence of consecutive days with contributions
/// that ends on today or yesterday. If today has no contributions but
/// yesterday did, the streak still counts (user might contribute later).
///
/// ## Algorithm
///
/// ```text
/// Start from end of days array (most recent)
///         │
///         ▼
/// ┌───────────────────────────────────────────┐
/// │ Is this day today or yesterday?           │
/// │ AND has contributions?                    │
/// └───────────────────────────────────────────┘
///         │
///    Yes  │  No ──▶ Return empty streak
///         ▼
/// ┌───────────────────────────────────────────┐
/// │ Walk backwards, counting consecutive      │
/// │ days with contributions                   │
/// └───────────────────────────────────────────┘
///         │
///         ▼
///    Return streak with count, start, end
/// ```
///
/// # Arguments
///
/// * `days` - Slice of contribution days (sorted chronologically)
///
/// # Returns
///
/// The current streak, or an empty streak if none exists
fn calculate_current_streak(days: &[ContributionDay]) -> Streak {
    if days.is_empty() {
        return Streak {
            count: 0,
            start_date: String::new(),
            end_date: String::new(),
        };
    }

    let today = chrono::Local::now().naive_local().date();
    let yesterday = today - chrono::Duration::days(1);

    // Work backwards from most recent day
    let mut streak_days: Vec<&ContributionDay> = Vec::new();

    for day in days.iter().rev() {
        if let Ok(date) = NaiveDate::parse_from_str(&day.date, "%Y-%m-%d") {
            if day.count > 0 {
                // Check if this day can be part of current streak
                if streak_days.is_empty() {
                    // First day must be today or yesterday
                    if date == today || date == yesterday {
                        streak_days.push(day);
                    } else {
                        break; // No current streak
                    }
                } else {
                    // Must be consecutive with previous day in streak
                    let last_date = NaiveDate::parse_from_str(
                        &streak_days.last().unwrap().date,
                        "%Y-%m-%d",
                    )
                    .unwrap();
                    if date == last_date - chrono::Duration::days(1) {
                        streak_days.push(day);
                    } else {
                        break;
                    }
                }
            } else if !streak_days.is_empty() {
                // Zero contributions breaks the streak
                break;
            } else if date < yesterday {
                // Haven't found start of streak and we're past yesterday
                break;
            }
        }
    }

    if streak_days.is_empty() {
        Streak {
            count: 0,
            start_date: String::new(),
            end_date: String::new(),
        }
    } else {
        Streak {
            count: streak_days.len() as u32,
            start_date: streak_days.last().unwrap().date.clone(), // Earliest day
            end_date: streak_days.first().unwrap().date.clone(),  // Most recent day
        }
    }
}

/// Calculates the longest streak ever achieved.
///
/// Scans through all days to find the longest sequence of
/// consecutive days with contributions.
///
/// ## Algorithm
///
/// ```text
/// For each day in chronological order:
///         │
///         ▼
/// ┌───────────────────────────────────────────┐
/// │ Does this day have contributions?         │
/// └───────────────────────────────────────────┘
///         │
///    Yes  │  No ──▶ Reset current streak counter
///         ▼
/// ┌───────────────────────────────────────────┐
/// │ Is this day consecutive with previous?    │
/// └───────────────────────────────────────────┘
///         │
///    Yes ─┼──▶ Increment current streak
///         │
///    No  ─┼──▶ Start new streak at 1
///         │
///         ▼
/// ┌───────────────────────────────────────────┐
/// │ Is current > longest?                     │
/// │ If yes, update longest                    │
/// └───────────────────────────────────────────┘
/// ```
///
/// # Arguments
///
/// * `days` - Slice of contribution days (sorted chronologically)
///
/// # Returns
///
/// The longest streak found
fn calculate_longest_streak(days: &[ContributionDay]) -> Streak {
    if days.is_empty() {
        return Streak {
            count: 0,
            start_date: String::new(),
            end_date: String::new(),
        };
    }

    let mut longest = Streak {
        count: 0,
        start_date: String::new(),
        end_date: String::new(),
    };

    let mut current_start: Option<String> = None;
    let mut current_count: u32 = 0;
    let mut last_date: Option<NaiveDate> = None;

    for day in days.iter() {
        if let Ok(date) = NaiveDate::parse_from_str(&day.date, "%Y-%m-%d") {
            if day.count > 0 {
                // Check if consecutive with previous day
                let is_consecutive = last_date
                    .map(|ld| date == ld + chrono::Duration::days(1))
                    .unwrap_or(false);

                if is_consecutive && current_start.is_some() {
                    // Continue existing streak
                    current_count += 1;
                } else {
                    // Start new streak
                    current_start = Some(day.date.clone());
                    current_count = 1;
                }

                // Update longest if current beats it
                if current_count > longest.count {
                    longest = Streak {
                        count: current_count,
                        start_date: current_start.clone().unwrap_or_default(),
                        end_date: day.date.clone(),
                    };
                }

                last_date = Some(date);
            } else {
                // Zero contributions - reset current streak
                current_start = None;
                current_count = 0;
                last_date = Some(date);
            }
        }
    }

    longest
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Tests basic HTML parsing functionality.
    #[test]
    fn test_parse_contribution_html() {
        let html = r#"
            <td data-date="2024-01-15" data-level="3"></td>
            <td data-date="2024-01-16" data-level="2"></td>
            <td data-date="2024-01-17" data-level="0"></td>
        "#;

        let days = parse_contribution_html(html).unwrap();
        assert_eq!(days.len(), 3);
        assert_eq!(days[0].date, "2024-01-15");
        assert_eq!(days[0].level, 3);
    }

    /// Tests statistics calculation.
    #[test]
    fn test_calculate_stats() {
        let days = vec![
            ContributionDay {
                date: "2024-01-15".to_string(),
                count: 5,
                level: 2,
            },
            ContributionDay {
                date: "2024-01-16".to_string(),
                count: 10,
                level: 4,
            },
            ContributionDay {
                date: "2024-01-17".to_string(),
                count: 0,
                level: 0,
            },
        ];

        let stats = calculate_stats(&days);
        assert_eq!(stats.total_contributions, 15);
        assert_eq!(stats.best_day.count, 10);
        assert_eq!(stats.best_day.date, "2024-01-16");
    }
}
