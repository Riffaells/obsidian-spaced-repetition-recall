import { getAllTags, TFile } from "obsidian";
import { SRSettings } from "./settings";
import { DEFAULT_DECKNAME } from "./constants";
import { Iadapter } from "./dataStore/adapter";

export class Tags {
    static isDefaultDackName(tag: string) {
        return tag === DEFAULT_DECKNAME;
    }

    static getFileTags(note: TFile) {
        const fileCachedData = Iadapter.instance.metadataCache.getFileCache(note) || {};
        const tags = getAllTags(fileCachedData) || [];
        return tags;
    }

    /**
     * @param {string} fileTags
     * @param {string} settingTags
     * @return {string | null} tag | null
     */
    static getTagFromSettingTags(fileTags: string[], settingTags: string[]): string {
        for (const tagToReview of settingTags) {
            if (fileTags.some((tag) => tag === tagToReview || tag.startsWith(tagToReview + "/"))) {
                return tagToReview;
            }
        }
        return null;
    }

    /**
     * if deckName of a note is in tagsToReview, return true.
     * @param deckName
     * @returns boolean
     */
    static isTagedNoteDeckName(deckName: string, settings: SRSettings) {
        const dn = this.getTagFromSettingTags([deckName], settings.tagsToReview);
        if (dn !== null) {
            return true;
        }
        return false;
    }

    /**
     * select a tag in tags , which is also in tagsToReview. If not, return null.
     * @param tags tags from note file.
     * @returns
     */
    static getNoteDeckName(note: TFile, settings: SRSettings): string | null {
        const tags = this.getFileTags(note);
        const dn = this.getTagFromSettingTags(tags, settings.tagsToReview);
        return dn;
    }
}
