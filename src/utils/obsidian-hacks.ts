import { App } from "obsidian";
import { convertToStringOrEmpty } from "./utils";
import { TextDirection } from "./TextDirection";

/**
 * Retrieves the text direction (RTL or LTR) setting from Obsidian's private internal config.
 * 
 * @warning This function accesses a private API (`app.vault.getConfig("rightToLeft")`).
 * It may break in future Obsidian versions.
 * 
 * @param app The Obsidian App instance
 * @returns TextDirection.Rtl if enabled, otherwise TextDirection.Ltr
 */
export function getObsidianRtlSetting(app: App): TextDirection {
    // Access private Obsidian API - app.vault.getConfig
    const vault = app.vault as any;
    const v = vault.getConfig ? vault.getConfig("rightToLeft") : undefined;
    return convertToStringOrEmpty(v) == "true" ? TextDirection.Rtl : TextDirection.Ltr;
}
