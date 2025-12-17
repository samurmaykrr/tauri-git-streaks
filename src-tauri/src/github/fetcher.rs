//! # GitHub Data Fetcher
//!
//! This module handles HTTP requests to GitHub's contribution endpoint.
//!
//! ## Endpoint Details
//!
//! GitHub exposes contribution data at a public endpoint that returns
//! an HTML fragment containing the contribution calendar SVG.
//!
//! ```text
//! URL: https://github.com/users/{username}/contributions
//!
//! Request:
//! ┌─────────────────────────────────────────────────────┐
//! │ GET /users/octocat/contributions HTTP/1.1          │
//! │ Host: github.com                                    │
//! │ User-Agent: Git-Streaks/1.0                        │
//! └─────────────────────────────────────────────────────┘
//!
//! Response (200 OK):
//! ┌─────────────────────────────────────────────────────┐
//! │ <svg class="js-calendar-graph-svg">                │
//! │   <g transform="translate(0, 20)">                  │
//! │     <g transform="translate(16, 0)">               │
//! │       <rect data-date="2024-01-01" data-level="2"/>│
//! │       <rect data-date="2024-01-02" data-level="3"/>│
//! │       ...                                          │
//! │     </g>                                            │
//! │   </g>                                              │
//! │ </svg>                                              │
//! └─────────────────────────────────────────────────────┘
//! ```
//!
//! ## Error Handling
//!
//! The fetcher handles several error cases:
//!
//! - **404 Not Found**: User doesn't exist
//! - **Network Error**: Connection failed
//! - **Parse Error**: HTML structure changed

use crate::github::parser::{calculate_stats, group_into_weeks, parse_contribution_html};
use crate::types::{ContributionData, UserInfo};

/// Fetches and parses GitHub contribution data for a user.
///
/// This is the main entry point for retrieving contribution data.
/// It performs an HTTP request to GitHub, parses the response,
/// calculates statistics, and returns a complete `ContributionData` struct.
///
/// ## Request Flow
///
/// ```text
/// fetch_contributions("octocat")
///          │
///          ▼
/// ┌─────────────────────────┐
/// │ Build HTTP Client       │
/// │ (with User-Agent)       │
/// └─────────────────────────┘
///          │
///          ▼
/// ┌─────────────────────────┐
/// │ GET /users/octocat/     │
/// │ contributions           │
/// └─────────────────────────┘
///          │
///          ├─── 404 ──▶ Error: "User may not exist"
///          │
///          ▼ 200
/// ┌─────────────────────────┐
/// │ Parse HTML              │──▶ parse_contribution_html()
/// └─────────────────────────┘
///          │
///          ▼
/// ┌─────────────────────────┐
/// │ Calculate Stats         │──▶ calculate_stats()
/// └─────────────────────────┘
///          │
///          ▼
/// ┌─────────────────────────┐
/// │ Group into Weeks        │──▶ group_into_weeks()
/// └─────────────────────────┘
///          │
///          ▼
/// ┌─────────────────────────┐
/// │ Return ContributionData │
/// └─────────────────────────┘
/// ```
///
/// # Arguments
///
/// * `username` - The GitHub username to fetch contributions for
///
/// # Returns
///
/// * `Ok(ContributionData)` - Complete contribution data including stats
/// * `Err(String)` - Error message describing what went wrong
///
/// # Errors
///
/// This function will return an error if:
/// - The HTTP client fails to initialize
/// - The network request fails
/// - GitHub returns a non-200 status code
/// - The response body cannot be read
/// - The HTML parsing fails
///
/// # Example
///
/// ```rust,ignore
/// let data = fetch_contributions("octocat").await?;
/// println!("Total contributions: {}", data.stats.total_contributions);
/// ```
pub async fn fetch_contributions(username: &str) -> Result<ContributionData, String> {
    // Build the GitHub contributions URL
    let url = format!("https://github.com/users/{}/contributions", username);

    // Create HTTP client with custom User-Agent
    let client = reqwest::Client::builder()
        .user_agent("Git-Streaks/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Make the request
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch contributions: {}", e))?;

    // Check for success status
    if !response.status().is_success() {
        return Err(format!(
            "GitHub returned status {}: User may not exist",
            response.status()
        ));
    }

    // Read response body
    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Parse the HTML to extract contribution days
    let days = parse_contribution_html(&html)?;
    
    // Calculate statistics from the parsed days
    let stats = calculate_stats(&days);
    
    // Group days into weeks for heatmap rendering
    let weeks = group_into_weeks(days);

    // Construct avatar URL using GitHub's pattern
    let avatar_url = format!("https://github.com/{}.png?size=80", username);

    // Build the complete contribution data structure
    let data = ContributionData {
        user: UserInfo {
            username: username.to_string(),
            avatar_url,
        },
        weeks,
        stats,
        last_updated: chrono::Utc::now().to_rfc3339(),
    };

    Ok(data)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Tests that fetching an invalid user returns an error.
    #[tokio::test]
    async fn test_fetch_contributions_invalid_user() {
        let result = fetch_contributions("this-user-definitely-does-not-exist-12345").await;
        assert!(result.is_err());
    }
}
