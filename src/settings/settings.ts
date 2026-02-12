/**
 * Settings module - Re-exports from core/settings for backward compatibility
 * 
 * @deprecated Import directly from "src/core/settings" instead
 */

export type { SRSettings } from "../core/settings/SRSettings";
export { DEFAULT_SETTINGS } from "../core/settings/DefaultSettings";

// Re-export everything from the new settings module
export * from "../core/settings";
