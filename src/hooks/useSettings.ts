/**
 * # useSettings Hook
 *
 * Custom React hook for managing application settings with persistence.
 *
 * ## Settings Flow
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                    Application Start                    │
 * └───────────────────────────┬─────────────────────────────┘
 *                             │
 *                             ▼
 *               ┌───────────────────────────┐
 *               │      Load Settings        │
 *               │   from Tauri Backend      │
 *               └─────────────┬─────────────┘
 *                             │
 *              ┌──────────────┴──────────────┐
 *              ▼                             ▼
 *     ┌────────────────┐           ┌─────────────────┐
 *     │ Settings Found │           │  Load Failed    │
 *     │ Use loaded     │           │ Use defaults    │
 *     └────────────────┘           └─────────────────┘
 * ```
 *
 * ## Save Settings Flow
 *
 * ```
 *   User Changes Setting
 *           │
 *           ▼
 * ┌─────────────────────┐
 * │  saveSettings()     │
 * └──────────┬──────────┘
 *            │
 *            ▼
 * ┌─────────────────────┐
 * │  Call Tauri API     │───────────┐
 * │  (saveSettingsApi)  │           │
 * └──────────┬──────────┘           │
 *            │                      │
 *    Success │              Error   │
 *            ▼                      ▼
 * ┌─────────────────────┐  ┌─────────────────┐
 * │ Update local state  │  │ Set error state │
 * │                     │  │ Throw error     │
 * └─────────────────────┘  └─────────────────┘
 * ```
 *
 * ## Settings Storage Location
 *
 * ```
 * macOS:   ~/Library/Application Support/com.gitstreaks.app/settings.json
 * Windows: %APPDATA%\com.gitstreaks.app\settings.json
 * Linux:   ~/.config/com.gitstreaks.app/settings.json
 * ```
 *
 * @module useSettings
 */

import { useState, useEffect, useCallback } from "react";
import type { Settings } from "../lib/types";
import { getSettings, saveSettings as saveSettingsApi } from "../lib/api";

/**
 * Return type for the useSettings hook.
 *
 * Provides settings data and actions for settings management.
 */
interface UseSettingsReturn {
  /** Current settings or null during initial load */
  settings: Settings | null;

  /** True during initial settings fetch */
  isLoading: boolean;

  /** Error message if load/save failed, null otherwise */
  error: string | null;

  /** Function to save updated settings to persistent storage */
  saveSettings: (settings: Settings) => Promise<void>;
}

/**
 * Default settings used when no saved settings exist.
 *
 * These values are applied on first app launch or when
 * settings file is corrupted/missing.
 */
const DEFAULT_SETTINGS: Settings = {
  /** No username - triggers welcome screen */
  username: "",

  /** Check for new contributions every hour (3600 seconds) */
  updateInterval: 3600,

  /** Green contribution colors (GitHub default) */
  iconStyle: "green",

  /** Don't auto-start by default */
  launchAtLogin: false,

  /** Follow system dark/light mode */
  theme: "system",
};

/**
 * Hook for managing application settings with Tauri backend persistence.
 *
 * This hook handles:
 * - Loading settings from Tauri storage on mount
 * - Providing default settings on first launch
 * - Saving settings to persistent storage
 * - Error handling for load/save operations
 *
 * ## Usage Example
 *
 * ```tsx
 * function SettingsPanel() {
 *   const { settings, isLoading, error, saveSettings } = useSettings();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   const handleThemeChange = async (theme: Settings["theme"]) => {
 *     await saveSettings({ ...settings!, theme });
 *   };
 *
 *   return (
 *     <div>
 *       <p>Current theme: {settings?.theme}</p>
 *       <button onClick={() => handleThemeChange("dark")}>
 *         Dark Mode
 *       </button>
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Object containing settings, loading state, error, and save function
 */
export function useSettings(): UseSettingsReturn {
  // Current settings state
  const [settings, setSettings] = useState<Settings | null>(null);

  // Loading state for initial fetch
  const [isLoading, setIsLoading] = useState(true);

  // Error state for load/save operations
  const [error, setError] = useState<string | null>(null);

  /**
   * Load settings from Tauri backend on component mount.
   *
   * If loading fails (e.g., first launch, corrupted file),
   * falls back to DEFAULT_SETTINGS to ensure app remains usable.
   */
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await getSettings();
        setSettings(loaded);
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Fallback to defaults ensures app is always usable
        setSettings(DEFAULT_SETTINGS);
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  /**
   * Save updated settings to persistent storage.
   *
   * Updates local state on success. On failure, sets error state
   * and re-throws the error for the caller to handle (e.g., show toast).
   *
   * @param newSettings - Complete settings object to save
   * @throws Error if save operation fails
   */
  const saveSettings = useCallback(async (newSettings: Settings) => {
    setError(null);

    try {
      await saveSettingsApi(newSettings);
      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      throw err; // Re-throw so caller can handle (e.g., show error UI)
    }
  }, []);

  return { settings, isLoading, error, saveSettings };
}
