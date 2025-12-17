//! # Data Types Module
//!
//! This module defines all the data structures used throughout the application
//! for representing GitHub contributions, statistics, and user settings.
//!
//! ## Type Hierarchy
//!
//! ```text
//! ContributionData
//! ├── user: UserInfo
//! │   ├── username: String
//! │   └── avatar_url: String
//! │
//! ├── weeks: Vec<ContributionWeek>
//! │   └── days: Vec<ContributionDay>
//! │       ├── date: String (YYYY-MM-DD)
//! │       ├── count: u32
//! │       └── level: u8 (0-4)
//! │
//! ├── stats: ContributionStats
//! │   ├── total_contributions: u32
//! │   ├── best_day: BestDay
//! │   ├── average_per_day: f32
//! │   ├── current_streak: Streak
//! │   └── longest_streak: Streak
//! │
//! └── last_updated: String (ISO 8601)
//! ```
//!
//! ## Contribution Levels
//!
//! GitHub uses 5 levels (0-4) to indicate contribution intensity:
//!
//! ```text
//! Level 0: ░░ No contributions
//! Level 1: ▒▒ Low (1-3 contributions)
//! Level 2: ▓▓ Medium-Low (4-6 contributions)
//! Level 3: ██ Medium-High (7-9 contributions)
//! Level 4: ██ High (10+ contributions)
//! ```

use serde::{Deserialize, Serialize};

// ============================================================================
// Contribution Day
// ============================================================================

/// Represents a single day's contribution data.
///
/// Each day in the contribution calendar is represented by this struct,
/// containing the date, contribution count, and visual intensity level.
///
/// # Fields
///
/// * `date` - ISO date string in YYYY-MM-DD format (e.g., "2024-12-17")
/// * `count` - Number of contributions made on this day
/// * `level` - Visual intensity level from 0-4 (used for heatmap coloring)
///
/// # Example
///
/// ```rust
/// let day = ContributionDay {
///     date: "2024-12-17".to_string(),
///     count: 5,
///     level: 2,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributionDay {
    /// Date in YYYY-MM-DD format
    pub date: String,
    
    /// Number of contributions on this day
    pub count: u32,
    
    /// Visual intensity level (0 = none, 4 = highest)
    pub level: u8,
}

// ============================================================================
// Best Day
// ============================================================================

/// Represents the day with the most contributions.
///
/// This is calculated by finding the maximum contribution count
/// across all days in the contribution history.
///
/// # Fields
///
/// * `date` - The date of the best day
/// * `count` - The number of contributions on that day
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BestDay {
    /// Date of the best contribution day
    pub date: String,
    
    /// Number of contributions on the best day
    pub count: u32,
}

// ============================================================================
// Streak
// ============================================================================

/// Represents a streak of consecutive contribution days.
///
/// A streak is a continuous sequence of days where at least one
/// contribution was made each day.
///
/// ## Streak Visualization
///
/// ```text
/// Week 1        Week 2        Week 3
/// ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
/// │░│░│█│█│█│█│█│█│█│█│█│█│█│░│░│░│█│█│█│░│░│
/// └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
///     └─────────────────────┘     └─────┘
///        11-day streak           3-day streak
///        (longest)               (current)
/// ```
///
/// # Fields
///
/// * `count` - Number of consecutive days in the streak
/// * `start_date` - First day of the streak
/// * `end_date` - Last day of the streak
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Streak {
    /// Number of consecutive days
    pub count: u32,
    
    /// First day of the streak (YYYY-MM-DD)
    pub start_date: String,
    
    /// Last day of the streak (YYYY-MM-DD)
    pub end_date: String,
}

// ============================================================================
// Contribution Statistics
// ============================================================================

/// Aggregated statistics calculated from contribution data.
///
/// These statistics provide a summary of the user's contribution
/// activity, including totals, averages, and streak information.
///
/// ## Statistics Overview
///
/// ```text
/// ┌─────────────────────────────────────────────────────────┐
/// │                  Contribution Statistics                │
/// ├──────────────────┬──────────────────────────────────────┤
/// │ Total            │ Sum of all contributions             │
/// │ Best Day         │ Day with most contributions          │
/// │ Average/Day      │ Mean contributions per day           │
/// │ Current Streak   │ Ongoing streak (ends today/yesterday)│
/// │ Longest Streak   │ Highest streak ever achieved         │
/// └──────────────────┴──────────────────────────────────────┘
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContributionStats {
    /// Total number of contributions in the period
    pub total_contributions: u32,
    
    /// The single best contribution day
    pub best_day: BestDay,
    
    /// Average contributions per day
    pub average_per_day: f32,
    
    /// Current active streak (must include today or yesterday)
    pub current_streak: Streak,
    
    /// Longest streak ever achieved
    pub longest_streak: Streak,
}

// ============================================================================
// User Info
// ============================================================================

/// Basic information about the GitHub user.
///
/// This is displayed in the header of the popup window,
/// showing the user's avatar and username.
///
/// # Fields
///
/// * `username` - The GitHub username
/// * `avatar_url` - URL to the user's avatar image
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    /// GitHub username
    pub username: String,
    
    /// URL to avatar image (GitHub's avatar pattern: https://github.com/{username}.png)
    pub avatar_url: String,
}

// ============================================================================
// Contribution Week
// ============================================================================

/// A week's worth of contribution data.
///
/// Weeks run from Sunday to Saturday, matching GitHub's
/// contribution calendar layout.
///
/// ## Week Layout
///
/// ```text
/// Sunday    ─┐
/// Monday    ─┤
/// Tuesday   ─┤
/// Wednesday ─┼─▶ ContributionWeek.days[0..7]
/// Thursday  ─┤
/// Friday    ─┤
/// Saturday  ─┘
/// ```
///
/// Note: Partial weeks at the beginning or end of the year
/// may have fewer than 7 days.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContributionWeek {
    /// Days in this week (typically 7, may be fewer for partial weeks)
    pub days: Vec<ContributionDay>,
}

// ============================================================================
// Contribution Data
// ============================================================================

/// Complete contribution data returned from the GitHub fetcher.
///
/// This is the main data structure passed between the Rust backend
/// and the React frontend. It contains all information needed to
/// render the contribution heatmap and statistics.
///
/// ## Data Flow
///
/// ```text
/// GitHub HTML ──▶ Parser ──▶ ContributionData ──▶ Frontend
///                              │
///                              ├── user (header display)
///                              ├── weeks (heatmap grid)
///                              ├── stats (statistics cards)
///                              └── last_updated (footer)
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContributionData {
    /// User information for header display
    pub user: UserInfo,
    
    /// Weeks of contribution data for heatmap rendering
    pub weeks: Vec<ContributionWeek>,
    
    /// Calculated statistics
    pub stats: ContributionStats,
    
    /// ISO 8601 timestamp of when data was fetched
    pub last_updated: String,
}

// ============================================================================
// Settings
// ============================================================================

/// Application settings persisted to disk.
///
/// Settings are stored using `tauri-plugin-store` and loaded
/// on application startup.
///
/// ## Settings Storage
///
/// ```text
/// Platform           Storage Location
/// ─────────────────────────────────────────────────────────
/// macOS              ~/Library/Application Support/
///                    com.gitstreaks.desktop/settings.json
/// Windows            %APPDATA%/com.gitstreaks.desktop/
///                    settings.json
/// Linux              ~/.config/com.gitstreaks.desktop/
///                    settings.json
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// GitHub username to fetch contributions for
    pub username: String,
    
    /// Auto-refresh interval in seconds (default: 3600 = 1 hour)
    pub update_interval: u64,
    
    /// Tray icon style: "monochrome" or "green"
    pub icon_style: String,
    
    /// Whether to start the app at system login
    pub launch_at_login: bool,
    
    /// UI theme: "system", "light", or "dark"
    pub theme: String,
}

impl Default for Settings {
    /// Returns default settings for new users.
    ///
    /// Default values:
    /// - `username`: empty (triggers welcome screen)
    /// - `update_interval`: 3600 seconds (1 hour)
    /// - `icon_style`: "green"
    /// - `launch_at_login`: false
    /// - `theme`: "system" (follows OS preference)
    fn default() -> Self {
        Self {
            username: String::new(),
            update_interval: 3600,
            icon_style: "green".to_string(),
            launch_at_login: false,
            theme: "system".to_string(),
        }
    }
}
