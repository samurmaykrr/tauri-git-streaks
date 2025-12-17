//! # Git Streaks - Main Application Module
//!
//! This module contains the core Tauri application setup, including system tray
//! management, window positioning, and IPC command handlers.
//!
//! ## Architecture Overview
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────────────┐
//! │                         Git Streaks Application                         │
//! ├─────────────────────────────────────────────────────────────────────────┤
//! │                                                                         │
//! │  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────┐│
//! │  │ System Tray │───▶│ Popup Window │───▶│      React Frontend         ││
//! │  │   (Icon)    │    │  (Webview)   │    │  - Heatmap                  ││
//! │  └─────────────┘    └──────────────┘    │  - Statistics               ││
//! │        │                   │            │  - Settings                 ││
//! │        │                   │            └─────────────────────────────┘│
//! │        │                   │                        │                  │
//! │        ▼                   ▼                        ▼                  │
//! │  ┌─────────────────────────────────────────────────────────────────┐  │
//! │  │                    Tauri IPC Commands                           │  │
//! │  │  - fetch_contributions    - get_settings                        │  │
//! │  │  - refresh_contributions  - save_settings                       │  │
//! │  │  - get_cached_contributions - hide_window                       │  │
//! │  │  - get_autostart_enabled  - set_autostart_enabled               │  │
//! │  └─────────────────────────────────────────────────────────────────┘  │
//! │                               │                                        │
//! │                               ▼                                        │
//! │  ┌─────────────────────────────────────────────────────────────────┐  │
//! │  │                    Backend Services                             │  │
//! │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
//! │  │  │   GitHub    │  │   Settings  │  │     Autostart           │ │  │
//! │  │  │   Fetcher   │  │    Store    │  │     Manager             │ │  │
//! │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
//! │  └─────────────────────────────────────────────────────────────────┘  │
//! │                                                                         │
//! └─────────────────────────────────────────────────────────────────────────┘
//! ```
//!
//! ## Data Flow
//!
//! ```text
//! User clicks tray icon
//!         │
//!         ▼
//! ┌───────────────────┐
//! │ Toggle Window     │
//! │ Visibility        │
//! └───────────────────┘
//!         │
//!         ▼
//! ┌───────────────────┐     ┌───────────────────┐
//! │ Position Window   │────▶│ Multi-Monitor     │
//! │ Near Tray Icon    │     │ Detection         │
//! └───────────────────┘     └───────────────────┘
//!         │
//!         ▼
//! ┌───────────────────┐
//! │ Frontend Requests │
//! │ Contribution Data │
//! └───────────────────┘
//!         │
//!         ▼
//! ┌───────────────────┐     ┌───────────────────┐
//! │ Fetch from GitHub │────▶│ Parse HTML        │
//! │ /users/{}/contribs│     │ Extract Data      │
//! └───────────────────┘     └───────────────────┘
//!         │
//!         ▼
//! ┌───────────────────┐
//! │ Cache & Return    │
//! │ to Frontend       │
//! └───────────────────┘
//! ```

mod github;
mod types;

use once_cell::sync::Lazy;
use std::sync::RwLock;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewWindow,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_store::StoreExt;
use types::{ContributionData, Settings};

// ============================================================================
// Global State
// ============================================================================

/// Global cache for contribution data.
/// 
/// This allows the frontend to quickly retrieve cached data without
/// making a network request. The cache is updated whenever new data
/// is fetched from GitHub.
static CONTRIBUTION_CACHE: Lazy<RwLock<Option<ContributionData>>> =
    Lazy::new(|| RwLock::new(None));

/// Global storage for the current GitHub username.
/// 
/// Stored separately from the cache to allow refreshing contributions
/// without re-specifying the username.
static CURRENT_USERNAME: Lazy<RwLock<Option<String>>> = Lazy::new(|| RwLock::new(None));

// ============================================================================
// Constants
// ============================================================================

/// Path to the settings file (relative to app data directory).
const STORE_PATH: &str = "settings.json";

/// Default window width in pixels.
const WINDOW_WIDTH: u32 = 420;

/// Default window height in pixels.
const WINDOW_HEIGHT: u32 = 520;

// ============================================================================
// Tauri Commands - Contributions
// ============================================================================

/// Fetches GitHub contribution data for a specified user.
///
/// This command:
/// 1. Makes an HTTP request to GitHub's contribution endpoint
/// 2. Parses the HTML response to extract contribution data
/// 3. Calculates statistics (streaks, totals, etc.)
/// 4. Caches the result for quick subsequent access
/// 5. Stores the username for refresh operations
///
/// # Arguments
///
/// * `username` - The GitHub username to fetch contributions for
///
/// # Returns
///
/// * `Ok(ContributionData)` - The parsed contribution data
/// * `Err(String)` - Error message if the fetch or parse fails
///
/// # Example (from frontend)
///
/// ```typescript
/// const data = await invoke<ContributionData>("fetch_contributions", {
///   username: "octocat"
/// });
/// ```
#[tauri::command]
async fn fetch_contributions(username: String) -> Result<ContributionData, String> {
    let data = github::fetch_contributions(&username).await?;

    // Cache the data for quick retrieval
    if let Ok(mut cache) = CONTRIBUTION_CACHE.write() {
        *cache = Some(data.clone());
    }

    // Store current username for refresh operations
    if let Ok(mut current) = CURRENT_USERNAME.write() {
        *current = Some(username);
    }

    Ok(data)
}

/// Returns cached contribution data if available.
///
/// This is used for instant loading when the app opens, showing
/// previously fetched data while fresh data is being loaded.
///
/// # Returns
///
/// * `Some(ContributionData)` - Cached data if available
/// * `None` - No cached data exists
#[tauri::command]
fn get_cached_contributions() -> Option<ContributionData> {
    CONTRIBUTION_CACHE.read().ok()?.clone()
}

/// Refreshes contribution data for the currently stored username.
///
/// This is useful for manual refresh operations where the username
/// is already known from a previous fetch.
///
/// # Returns
///
/// * `Ok(ContributionData)` - Fresh contribution data
/// * `Err(String)` - Error if no username is stored or fetch fails
#[tauri::command]
async fn refresh_contributions() -> Result<ContributionData, String> {
    let username = CURRENT_USERNAME
        .read()
        .ok()
        .and_then(|u| u.clone())
        .ok_or_else(|| "No username set".to_string())?;

    fetch_contributions(username).await
}

// ============================================================================
// Tauri Commands - Settings
// ============================================================================

/// Retrieves the current application settings.
///
/// Settings are loaded from the persistent store and merged with
/// the actual autostart state from the system.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// The current settings, or defaults if the store is unavailable
#[tauri::command]
fn get_settings(app: AppHandle) -> Settings {
    let store = match app.store(STORE_PATH) {
        Ok(s) => s,
        Err(_) => return Settings::default(),
    };

    // Check actual autostart state from the system
    let launch_at_login = app.autolaunch().is_enabled().unwrap_or(false);

    Settings {
        username: store
            .get("username")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default(),
        update_interval: store
            .get("updateInterval")
            .and_then(|v| v.as_u64())
            .unwrap_or(3600),
        icon_style: store
            .get("iconStyle")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "green".to_string()),
        launch_at_login,
        theme: store
            .get("theme")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "system".to_string()),
    }
}

/// Saves application settings to persistent storage.
///
/// This also updates the in-memory username and configures
/// the system autostart setting.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `settings` - The settings to save
///
/// # Returns
///
/// * `Ok(())` - Settings saved successfully
/// * `Err(String)` - Error message if save fails
#[tauri::command]
fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    // Persist settings to store
    store.set("username", serde_json::json!(settings.username));
    store.set(
        "updateInterval",
        serde_json::json!(settings.update_interval),
    );
    store.set("iconStyle", serde_json::json!(settings.icon_style));
    store.set("theme", serde_json::json!(settings.theme));

    store.save().map_err(|e| e.to_string())?;

    // Update current username in memory for refresh operations
    if let Ok(mut current) = CURRENT_USERNAME.write() {
        *current = Some(settings.username);
    }

    // Configure system autostart
    let autostart = app.autolaunch();
    if settings.launch_at_login {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }

    Ok(())
}

// ============================================================================
// Tauri Commands - Window Management
// ============================================================================

/// Hides the main application window.
///
/// Called from the frontend when the user clicks outside
/// the window or presses Escape.
///
/// # Arguments
///
/// * `window` - The webview window to hide
#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

// ============================================================================
// Tauri Commands - Autostart
// ============================================================================

/// Checks if autostart (launch at login) is currently enabled.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// `true` if the app is configured to start at login, `false` otherwise
#[tauri::command]
fn get_autostart_enabled(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// Enables or disables autostart (launch at login).
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `enabled` - Whether to enable or disable autostart
///
/// # Returns
///
/// * `Ok(())` - Autostart setting changed successfully
/// * `Err(String)` - Error message if the operation fails
#[tauri::command]
fn set_autostart_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())
    } else {
        autostart.disable().map_err(|e| e.to_string())
    }
}

// ============================================================================
// Window Positioning
// ============================================================================

/// Positions the popup window near the system tray icon.
///
/// This function handles multi-monitor setups by:
/// 1. Finding which monitor contains the click position
/// 2. Centering the window horizontally on the click
/// 3. Positioning vertically based on OS conventions
/// 4. Clamping to monitor bounds with padding
///
/// ## Window Positioning Diagram
///
/// ```text
/// macOS (menu bar at top):
/// ┌────────────────────────────────────────────────┐
/// │ Menu Bar              [Tray Icon] ◀── Click    │
/// ├────────────────────────────────────────────────┤
/// │                    ┌──────────┐                │
/// │                    │  Popup   │ ◀── Window     │
/// │                    │  Window  │    appears     │
/// │                    └──────────┘    below       │
/// │                                                │
/// │                                                │
/// └────────────────────────────────────────────────┘
///
/// Windows (taskbar at bottom):
/// ┌────────────────────────────────────────────────┐
/// │                                                │
/// │                    ┌──────────┐                │
/// │                    │  Popup   │ ◀── Window     │
/// │                    │  Window  │    appears     │
/// │                    └──────────┘    above       │
/// ├────────────────────────────────────────────────┤
/// │ Taskbar               [Tray Icon] ◀── Click    │
/// └────────────────────────────────────────────────┘
/// ```
///
/// ## Multi-Monitor Detection
///
/// ```text
/// Monitor 1                    Monitor 2
/// ┌─────────────────┐         ┌─────────────────┐
/// │                 │         │        X        │ ◀── Click at (X)
/// │                 │         │    ┌──────┐     │
/// │                 │         │    │Window│     │ ◀── Window on
/// │                 │         │    └──────┘     │     correct monitor
/// └─────────────────┘         └─────────────────┘
/// (0,0)            (1920,0)  (1920,0)         (3840,0)
/// ```
///
/// # Arguments
///
/// * `window` - The window to position
/// * `click_x` - X coordinate of the tray icon click
/// * `click_y` - Y coordinate of the tray icon click
fn position_window_at_tray(window: &WebviewWindow, click_x: f64, click_y: f64) {
    // Get window size (use defaults if unavailable)
    let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
    });

    let window_width = window_size.width as i32;
    let window_height = window_size.height as i32;

    // Get all available monitors
    let monitors = window.available_monitors().unwrap_or_default();

    // Find which monitor contains the click position
    let mut target_monitor_bounds: Option<(i32, i32, u32, u32)> = None;

    for monitor in monitors.iter() {
        let pos = monitor.position();
        let size = monitor.size();

        let mon_x = pos.x;
        let mon_y = pos.y;
        let mon_width = size.width;
        let mon_height = size.height;

        // Check if click is within this monitor's bounds
        if click_x >= mon_x as f64
            && click_x < (mon_x + mon_width as i32) as f64
            && click_y >= mon_y as f64
            && click_y < (mon_y + mon_height as i32) as f64
        {
            target_monitor_bounds = Some((mon_x, mon_y, mon_width, mon_height));
            break;
        }
    }

    // Fallback to primary monitor or default resolution
    let (mon_x, mon_y, mon_width, mon_height) = target_monitor_bounds.unwrap_or_else(|| {
        if let Some(primary) = window.primary_monitor().ok().flatten() {
            let pos = primary.position();
            let size = primary.size();
            (pos.x, pos.y, size.width, size.height)
        } else {
            (0, 0, 1920, 1080)
        }
    });

    // Calculate initial position - centered horizontally on click
    let mut pos_x = (click_x as i32) - (window_width / 2);

    // Vertical positioning varies by platform
    #[cfg(target_os = "macos")]
    let mut pos_y = click_y as i32 + 5; // Below menu bar on macOS

    #[cfg(target_os = "windows")]
    let mut pos_y = (click_y as i32) - window_height - 10; // Above taskbar on Windows

    #[cfg(target_os = "linux")]
    let mut pos_y = click_y as i32 + 5;

    // Clamp to monitor bounds with padding
    let padding = 8;
    let mon_right = mon_x + mon_width as i32;
    let mon_bottom = mon_y + mon_height as i32;

    // Horizontal bounds check
    if pos_x < mon_x + padding {
        pos_x = mon_x + padding;
    }
    if pos_x + window_width > mon_right - padding {
        pos_x = mon_right - window_width - padding;
    }

    // Vertical bounds check (platform-specific)
    #[cfg(target_os = "macos")]
    {
        // macOS menu bar is typically 25px
        let menu_bar_height = 25;
        if pos_y < mon_y + menu_bar_height {
            pos_y = mon_y + menu_bar_height;
        }
        if pos_y + window_height > mon_bottom - padding {
            pos_y = mon_bottom - window_height - padding;
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        if pos_y < mon_y + padding {
            pos_y = mon_y + padding;
        }
        if pos_y + window_height > mon_bottom - padding {
            pos_y = mon_bottom - window_height - padding;
        }
    }

    let position = tauri::PhysicalPosition { x: pos_x, y: pos_y };
    let _ = window.set_position(position);
}

/// Toggles the visibility of the main window at the specified position.
///
/// If the window is visible, it hides it. If hidden, it positions
/// the window near the click and shows it with focus.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `x` - X coordinate for positioning
/// * `y` - Y coordinate for positioning
fn toggle_window_at_position(app: &AppHandle, x: f64, y: f64) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            position_window_at_tray(&window, x, y);
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

// ============================================================================
// System Tray Setup
// ============================================================================

/// Sets up the system tray icon with menu and event handlers.
///
/// ## Tray Interaction Model
///
/// ```text
/// ┌─────────────────────────────────────────┐
/// │           System Tray Icon              │
/// │                                         │
/// │  Left Click ──────▶ Toggle popup window │
/// │                                         │
/// │  Right Click ─────▶ Show context menu   │
/// │                     └─▶ "Quit Git Streaks"
/// └─────────────────────────────────────────┘
/// ```
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// * `Ok(())` - Tray setup successful
/// * `Err` - Error if icon loading or tray creation fails
fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Create right-click context menu with quit option
    let quit_item = MenuItemBuilder::with_id("quit", "Quit Git Streaks").build(app)?;
    let menu = MenuBuilder::new(app).item(&quit_item).build()?;

    // Load tray icon from embedded bytes
    let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;

    // Build tray icon with event handlers
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false) // Left click toggles window
        .tooltip("Git Streaks")
        .on_tray_icon_event(|tray, event| {
            // Handle left click to toggle window
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            {
                toggle_window_at_position(tray.app_handle(), position.x, position.y);
            }
        })
        .on_menu_event(|app, event| {
            // Handle menu item clicks
            if event.id().as_ref() == "quit" {
                app.exit(0);
            }
        })
        .build(app)?;

    Ok(())
}

// ============================================================================
// Settings Initialization
// ============================================================================

/// Loads the saved username from the settings store into memory.
///
/// This is called during app startup to restore the previous user's
/// session, allowing the app to immediately fetch their contributions.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
fn load_saved_username(app: &AppHandle) {
    if let Ok(store) = app.store(STORE_PATH) {
        if let Some(username) = store.get("username").and_then(|v| v.as_str().map(String::from)) {
            if !username.is_empty() {
                if let Ok(mut current) = CURRENT_USERNAME.write() {
                    *current = Some(username);
                }
            }
        }
    }
}

// ============================================================================
// Application Entry Point
// ============================================================================

/// Main entry point for the Tauri application.
///
/// ## Initialization Sequence
///
/// ```text
/// ┌─────────────────────────────────────────────────────────────────┐
/// │                    Application Startup                          │
/// └─────────────────────────────────────────────────────────────────┘
///                              │
///                              ▼
/// ┌─────────────────────────────────────────────────────────────────┐
/// │ 1. Initialize Plugins                                           │
/// │    - tauri-plugin-store (settings persistence)                  │
/// │    - tauri-plugin-autostart (launch at login)                   │
/// └─────────────────────────────────────────────────────────────────┘
///                              │
///                              ▼
/// ┌─────────────────────────────────────────────────────────────────┐
/// │ 2. Setup Phase                                                  │
/// │    - Create system tray icon                                    │
/// │    - Load saved username                                        │
/// │    - Set activation policy (macOS: hide from dock)              │
/// └─────────────────────────────────────────────────────────────────┘
///                              │
///                              ▼
/// ┌─────────────────────────────────────────────────────────────────┐
/// │ 3. Register IPC Handlers                                        │
/// │    - Contribution commands                                      │
/// │    - Settings commands                                          │
/// │    - Window management commands                                 │
/// └─────────────────────────────────────────────────────────────────┘
///                              │
///                              ▼
/// ┌─────────────────────────────────────────────────────────────────┐
/// │ 4. Run Event Loop                                               │
/// │    - Process tray events                                        │
/// │    - Handle IPC calls from frontend                             │
/// └─────────────────────────────────────────────────────────────────┘
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugin: Persistent settings storage
        .plugin(tauri_plugin_store::Builder::new().build())
        // Plugin: Launch at login functionality
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]), // Start hidden when launched at login
        ))
        .setup(|app| {
            // Initialize system tray
            setup_tray(app.handle())?;

            // Load saved username for session restoration
            load_saved_username(app.handle());

            // macOS: Run as accessory app (no dock icon)
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            Ok(())
        })
        // Register all IPC command handlers
        .invoke_handler(tauri::generate_handler![
            fetch_contributions,
            get_cached_contributions,
            refresh_contributions,
            get_settings,
            save_settings,
            hide_window,
            get_autostart_enabled,
            set_autostart_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
