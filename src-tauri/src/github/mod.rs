//! # GitHub Module
//!
//! This module handles all GitHub-related functionality, including
//! fetching contribution data and parsing the HTML response.
//!
//! ## Module Structure
//!
//! ```text
//! github/
//! ├── mod.rs      ◀── You are here (public exports)
//! ├── fetcher.rs  ── HTTP client for fetching GitHub data
//! └── parser.rs   ── HTML parsing and statistics calculation
//! ```
//!
//! ## Data Pipeline
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                    GitHub Data Pipeline                         │
//! └─────────────────────────────────────────────────────────────────┘
//!                              │
//!                              ▼
//! ┌─────────────────────────────────────────────────────────────────┐
//! │ 1. Fetch HTML                                                   │
//! │    GET https://github.com/users/{username}/contributions        │
//! │    Returns: Raw HTML with SVG contribution calendar             │
//! └─────────────────────────────────────────────────────────────────┘
//!                              │
//!                              ▼
//! ┌─────────────────────────────────────────────────────────────────┐
//! │ 2. Parse HTML                                                   │
//! │    Extract: data-date="YYYY-MM-DD" data-level="0-4"            │
//! │    Extract: Contribution counts from tooltips                   │
//! └─────────────────────────────────────────────────────────────────┘
//!                              │
//!                              ▼
//! ┌─────────────────────────────────────────────────────────────────┐
//! │ 3. Calculate Statistics                                         │
//! │    - Total contributions                                        │
//! │    - Best day (max contributions)                               │
//! │    - Current streak (consecutive days ending today/yesterday)   │
//! │    - Longest streak (highest consecutive days ever)             │
//! └─────────────────────────────────────────────────────────────────┘
//!                              │
//!                              ▼
//! ┌─────────────────────────────────────────────────────────────────┐
//! │ 4. Group into Weeks                                             │
//! │    Organize days into Sunday-Saturday weeks                     │
//! │    for heatmap rendering                                        │
//! └─────────────────────────────────────────────────────────────────┘
//!                              │
//!                              ▼
//! ┌─────────────────────────────────────────────────────────────────┐
//! │ 5. Return ContributionData                                      │
//! │    Complete data structure ready for frontend                   │
//! └─────────────────────────────────────────────────────────────────┘
//! ```

mod fetcher;
mod parser;

// Re-export the main fetch function for use by the rest of the application
pub use fetcher::fetch_contributions;
