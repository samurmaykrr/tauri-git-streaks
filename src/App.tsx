/**
 * # App Component
 *
 * Root component for Git Streaks - a GitHub contribution heatmap viewer.
 *
 * ## Application Views
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                        VIEW STATES                                  │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  1. LOADING STATE                2. WELCOME/SETTINGS VIEW           │
 * │  ┌───────────────────┐           ┌───────────────────────────┐     │
 * │  │                   │           │ ← Settings                │     │
 * │  │      [spin]       │           │                           │     │
 * │  │    Loading...     │           │ GitHub Username           │     │
 * │  │                   │           │ ┌─────────────────┬─────┐ │     │
 * │  └───────────────────┘           │ │ octocat         │Save │ │     │
 * │                                  │ └─────────────────┴─────┘ │     │
 * │                                  │                           │     │
 * │                                  │ Theme                     │     │
 * │                                  │ [System] [Light] [Dark]   │     │
 * │                                  │                           │     │
 * │                                  │ Startup                   │     │
 * │                                  │ [Toggle] Launch at Login  │     │
 * │                                  └───────────────────────────┘     │
 * │                                                                     │
 * │  3. MAIN VIEW                    4. ERROR STATE                    │
 * │  ┌───────────────────────────┐   ┌───────────────────────────┐    │
 * │  │ [avatar] user        [⚙] │   │                           │    │
 * │  ├───────────────────────────┤   │    Failed to load data   │    │
 * │  │                           │   │                           │    │
 * │  │   [====== Heatmap =====]  │   │   [Try Again] [Settings] │    │
 * │  │                           │   │                           │    │
 * │  │  ┌──────┬──────┐         │   └───────────────────────────┘    │
 * │  │  │Total │Best  │         │                                     │
 * │  │  │ 1234 │  42  │         │                                     │
 * │  │  ├──────┼──────┤         │                                     │
 * │  │  │Long. │Curr. │         │                                     │
 * │  │  │45 d  │12 d  │         │                                     │
 * │  │  └──────┴──────┘         │                                     │
 * │  ├───────────────────────────┤                                     │
 * │  │ Updated 5m ago   [Refresh]│                                     │
 * │  └───────────────────────────┘                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## State Machine
 *
 * ```
 *                     ┌─────────────────┐
 *                     │   App Start     │
 *                     └────────┬────────┘
 *                              │
 *                              ▼
 *                     ┌─────────────────┐
 *                     │ Load Settings   │
 *                     └────────┬────────┘
 *                              │
 *              ┌───────────────┴───────────────┐
 *              ▼                               ▼
 *     ┌─────────────────┐             ┌─────────────────┐
 *     │ No Username     │             │ Has Username    │
 *     │ (Welcome Screen)│             │                 │
 *     └────────┬────────┘             └────────┬────────┘
 *              │                               │
 *              │ User enters                   ▼
 *              │ username          ┌─────────────────┐
 *              │                   │ Fetch Data      │
 *              └──────────────────▶└────────┬────────┘
 *                                           │
 *                              ┌────────────┴────────────┐
 *                              ▼                         ▼
 *                     ┌─────────────────┐       ┌─────────────────┐
 *                     │    Success      │       │     Error       │
 *                     │  (Main View)    │       │  (Error View)   │
 *                     └─────────────────┘       └─────────────────┘
 *                              │                         │
 *                              └─────────────────────────┘
 *                                         │
 *                     User clicks Settings │
 *                                         ▼
 *                              ┌─────────────────┐
 *                              │ Settings View   │
 *                              └─────────────────┘
 * ```
 *
 * ## Theme System
 *
 * ```
 * Theme Selection          Applied to HTML
 * ────────────────         ─────────────────
 * "system"        ──▶      No data-theme attribute (uses prefers-color-scheme)
 * "light"         ──▶      data-theme="light"
 * "dark"          ──▶      data-theme="dark"
 *
 * CSS Variables (from App.css):
 * ┌────────────────────────────────────────────────────────────┐
 * │  --bg-primary       Background colors                      │
 * │  --bg-secondary                                            │
 * │  --bg-tertiary                                             │
 * │  --text-primary     Text colors                            │
 * │  --text-secondary                                          │
 * │  --text-tertiary                                           │
 * │  --accent-green     GitHub contribution green              │
 * │  --accent-red       Error states                           │
 * │  --border-default   Border colors                          │
 * │  --border-muted                                            │
 * └────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Event System
 *
 * ```
 * System Tray Menu                    Frontend
 * ─────────────────                   ────────
 *      │                                  │
 *      │   "refresh-requested" event      │
 *      │ ─────────────────────────────▶   │
 *      │                                  │
 *      │                          ┌───────┴───────┐
 *      │                          │ useEffect     │
 *      │                          │ listener      │
 *      │                          └───────┬───────┘
 *      │                                  │
 *      │                                  ▼
 *      │                          ┌───────────────┐
 *      │                          │  refresh()    │
 *      │                          └───────────────┘
 * ```
 *
 * @module App
 */

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useContributions } from "./hooks/useContributions";
import { useSettings } from "./hooks/useSettings";
import { Heatmap } from "./components/heatmap/Heatmap";
import { StatCard } from "./components/stats/StatCard";
import { UserHeader } from "./components/user/UserHeader";
import { formatDate, formatStreak, formatRelativeTime } from "./lib/utils";
import type { Settings } from "./lib/types";
import "./App.css";

// ============================================================================
// SVG Icon Components
// ============================================================================
// Custom SVG icons used throughout the app. Using inline SVGs instead of
// icon libraries for smaller bundle size and full control over styling.
// ============================================================================

/**
 * Refresh/sync icon with rotation animation support.
 * Used for refresh buttons and loading spinners.
 */
const RefreshIcon = ({ className = "", size = 16, color }: { className?: string; size?: number; color?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);

/** Settings cog/gear icon for settings button. */
const CogIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

/** Fire/flame icon for streak statistics. */
const FireIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.52.74-4.6 2.2-6.18.29-.32.74-.4 1.12-.22.38.18.6.56.57.97-.28 3.89 2.11 5.43 4.11 5.43 1.5 0 2.5-.97 2.5-2.5 0-1.16-.53-2.19-1.26-3.1C10.67 7.39 10 5.09 10 3.5c0-.38.22-.73.56-.89.34-.16.75-.1 1.03.16C14.79 5.61 21 10.5 21 15c0 4.42-4.03 8-9 8z"/>
  </svg>
);

/** Calendar icon for current streak statistics. */
const CalendarIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

/** Bar chart icon for total contributions statistic. */
const ChartIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

/** Star icon for best day statistic. */
const StarIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

/** Sun icon for light theme option. */
const SunIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
  </svg>
);

/** Moon icon for dark theme option. */
const MoonIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

/** Monitor icon for system theme option. */
const MonitorIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

/** Left arrow icon for back navigation. */
const ArrowLeftIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"></path>
  </svg>
);

/** Power icon for launch at login toggle. */
const PowerIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

// ============================================================================
// Theme Management
// ============================================================================

/**
 * Applies the selected theme to the document root.
 *
 * Theme application:
 * - "system": Removes data-theme, uses CSS prefers-color-scheme
 * - "light"/"dark": Sets data-theme attribute for explicit theme
 *
 * @param theme - Theme to apply
 */
function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

// ============================================================================
// Main App Component
// ============================================================================

/**
 * Root application component for Git Streaks.
 *
 * Manages the entire application state and renders the appropriate view
 * based on loading state, settings, and user data.
 *
 * ## Component Responsibilities
 *
 * - Loading and persisting settings
 * - Fetching GitHub contribution data
 * - Managing theme (light/dark/system)
 * - Handling autostart configuration
 * - Listening for refresh events from system tray
 * - Rendering appropriate view (loading, welcome, main, error, settings)
 *
 * @returns Rendered application
 */
function App() {
  // ─────────────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────────────

  // Settings from Tauri persistent storage
  const { settings, isLoading: settingsLoading, saveSettings } = useSettings();

  // Local state for username (synced with settings)
  const [username, setUsername] = useState<string>("");
  const [inputValue, setInputValue] = useState("");

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Theme and autostart state (local copies for immediate UI updates)
  const [currentTheme, setCurrentTheme] = useState<Settings["theme"]>("system");
  const [launchAtLogin, setLaunchAtLogin] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sync theme and autostart from settings when they load/change.
   * Updates local state and applies theme to document.
   */
  useEffect(() => {
    if (settings?.theme) {
      setCurrentTheme(settings.theme);
      applyTheme(settings.theme);
    }
    if (settings?.launchAtLogin !== undefined) {
      setLaunchAtLogin(settings.launchAtLogin);
    }
  }, [settings?.theme, settings?.launchAtLogin]);

  /**
   * Sync username from settings when they load.
   * Populates both the display username and input field.
   */
  useEffect(() => {
    if (settings?.username) {
      setUsername(settings.username);
      setInputValue(settings.username);
    }
  }, [settings]);

  // Contribution data from GitHub (fetched via useContributions hook)
  const { data, isLoading, isRefreshing, error, refresh } = useContributions(username);

  /**
   * Listen for refresh events from the system tray.
   * When user clicks "Refresh" in tray menu, triggers data refresh.
   */
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
    };

    const unlisten = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("refresh-requested", handleRefresh);
    };

    const unlistenPromise = unlisten();

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [refresh]);

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handles username form submission.
   * Saves username to settings and triggers data fetch.
   */
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsSaving(true);
    try {
      await saveSettings({
        ...settings!,
        username: inputValue.trim(),
      });
      setUsername(inputValue.trim());
      setShowSettings(false);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles theme selection change.
   * Updates local state immediately for responsive UI, then persists to settings.
   */
  const handleThemeChange = async (theme: Settings["theme"]) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    
    if (settings) {
      try {
        await saveSettings({
          ...settings,
          theme,
        });
      } catch (err) {
        console.error("Failed to save theme:", err);
      }
    }
  };

  /**
   * Handles launch at login toggle.
   * Calls Tauri backend to enable/disable autostart, then saves to settings.
   * Reverts UI on error.
   */
  const handleLaunchAtLoginChange = async (enabled: boolean) => {
    setLaunchAtLogin(enabled);
    
    try {
      await invoke("set_autostart_enabled", { enabled });
      if (settings) {
        await saveSettings({
          ...settings,
          launchAtLogin: enabled,
        });
      }
    } catch (err) {
      console.error("Failed to set autostart:", err);
      // Revert on error
      setLaunchAtLogin(!enabled);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render Logic
  // ─────────────────────────────────────────────────────────────────────────

  // View 1: Initial loading state (settings loading)
  if (settingsLoading) {
    return (
      <div className="app-container">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshIcon className="animate-spin" color="var(--text-secondary)" size={32} />
            <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
              Loading...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // View 2: Loading contributions state
  if (isLoading && !data && username) {
    return (
      <div className="app-container">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshIcon className="animate-spin" color="var(--text-secondary)" size={32} />
            <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
              Loading contributions...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // View 3: Error state (data fetch failed)
  if (error && !data && username) {
    return (
      <div className="app-container">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm" style={{ color: "var(--accent-red)", fontFamily: "monospace" }}>
              {error}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => refresh()}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)"
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)"
                }}
              >
                Change Username
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View 4: Settings/Welcome view
  // Shows when: no username (welcome), user clicked settings, or no data
  if (showSettings || !username || !data) {
    const isWelcome = !username;
    
    return (
      <div className="app-container">
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            {!isWelcome && data && (
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeftIcon size={18} />
              </button>
            )}
            <h2 className="font-medium text-base" style={{ color: "var(--text-primary)" }}>
              {isWelcome ? "Welcome to Git Streaks" : "Settings"}
            </h2>
          </div>

          {isWelcome && (
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Enter your GitHub username to start tracking your contribution streaks.
            </p>
          )}

          {/* Username section */}
          <form onSubmit={handleUsernameSubmit} className="mb-6">
            <label
              className="block text-xs font-medium mb-2 uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              GitHub Username
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter username"
                autoFocus={isWelcome}
                className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace"
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSaving}
                className="px-4 py-2 rounded-md font-medium text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--accent-green)",
                  color: "#000"
                }}
              >
                {isSaving ? "..." : "Save"}
              </button>
            </div>
          </form>

          {/* Theme section */}
          <div className="mb-6">
            <label
              className="block text-xs font-medium mb-2 uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "system" as const, label: "System", icon: <MonitorIcon size={18} /> },
                { value: "light" as const, label: "Light", icon: <SunIcon size={18} /> },
                { value: "dark" as const, label: "Dark", icon: <MoonIcon size={18} /> },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-md transition-colors"
                  style={{
                    background: currentTheme === value ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                    border: `1px solid ${currentTheme === value ? "var(--accent-green)" : "var(--border-default)"}`,
                    color: currentTheme === value ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Launch at Login section */}
          <div>
            <label
              className="block text-xs font-medium mb-2 uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Startup
            </label>
            <button
              onClick={() => handleLaunchAtLoginChange(!launchAtLogin)}
              className="w-full flex items-center justify-between p-3 rounded-md transition-colors"
              style={{
                background: "var(--bg-secondary)",
                border: `1px solid ${launchAtLogin ? "var(--accent-green)" : "var(--border-default)"}`,
              }}
            >
              <div className="flex items-center gap-3">
                <PowerIcon size={18} />
                <div className="text-left">
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Launch at Login
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Start Git Streaks when you log in
                  </div>
                </div>
              </div>
              {/* Toggle switch */}
              <div
                className="relative w-10 h-6 rounded-full transition-colors"
                style={{
                  background: launchAtLogin ? "var(--accent-green)" : "var(--bg-tertiary)",
                }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: "white",
                    left: launchAtLogin ? "calc(100% - 20px)" : "4px",
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View 5: Main view - Contribution heatmap and stats
  // Shows when username is set, data is loaded, and not in settings
  return (
    <div className="app-container">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3"
        style={{ borderBottom: "1px solid var(--border-muted)" }}
      >
        <UserHeader user={data.user} />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Settings"
        >
          <CogIcon size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {/* Heatmap */}
        <div className="mb-3">
          <Heatmap weeks={data.weeks} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Total"
            value={data.stats.totalContributions}
            icon={<ChartIcon />}
          />
          <StatCard
            label="Best Day"
            value={data.stats.bestDay.count}
            sublabel={formatDate(data.stats.bestDay.date)}
            icon={<StarIcon />}
          />
          <StatCard
            label="Longest"
            value={formatStreak(data.stats.longestStreak)}
            sublabel={
              data.stats.longestStreak.count > 0
                ? `${formatDate(data.stats.longestStreak.startDate)} - ${formatDate(data.stats.longestStreak.endDate)}`
                : undefined
            }
            icon={<FireIcon />}
            variant="highlight"
          />
          <StatCard
            label="Current"
            value={formatStreak(data.stats.currentStreak)}
            sublabel={
              data.stats.currentStreak.count > 0
                ? data.stats.currentStreak.startDate === data.stats.currentStreak.endDate
                  ? "Today"
                  : `${formatDate(data.stats.currentStreak.startDate)} - ${formatDate(data.stats.currentStreak.endDate)}`
                : undefined
            }
            icon={<CalendarIcon />}
            variant={data.stats.currentStreak.count > 0 ? "highlight" : "default"}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderTop: "1px solid var(--border-muted)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "monospace" }}>
          Updated {formatRelativeTime(data.lastUpdated)}
        </span>
        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
          style={{ color: "var(--text-secondary)" }}
        >
          <RefreshIcon className={isRefreshing ? "animate-spin" : ""} size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
}

export default App;
