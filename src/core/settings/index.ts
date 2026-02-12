/**
 * Settings module - centralized settings management
 * 
 * This module provides:
 * - Type definitions for settings (SRSettings)
 * - Default settings values (DEFAULT_SETTINGS)
 * - Settings constants (SettingsConstants)
 * - Settings categories (SettingsCategories)
 * - Helper functions (SettingsHelpers)
 * - Migration utilities (SettingsMigration)
 */

// Core settings types and defaults
export type { SRSettings } from "./SRSettings";
export { DEFAULT_SETTINGS } from "./DefaultSettings";

// Settings migration
export { SettingsMigration } from "./SettingsMigration";

// Constants - import as namespace to avoid naming conflicts
export * as SettingsConstants from "./SettingsConstants";

// Category types
export * from "./SettingsCategories";

// Helper functions
export * from "./SettingsHelpers";
