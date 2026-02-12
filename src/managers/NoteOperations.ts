import { FrontMatterCache, getAllTags, Notice, TFile } from "obsidian";
import { Note } from "src/core/models/Note";
import { NoteFileLoader } from "src/core/services/NoteFileLoader";
import { ISRFile, SrTFile } from "src/core/services/SRFile";
import { TopicPath } from "src/core/services/TopicPath";
import { ReviewResponse, schedule } from "src/core/scheduling/scheduling";
import { SchedNote } from "src/core/models/ReviewDeck";
import { SCHEDULING_INFO_REGEX, YAML_FRONT_MATTER_REGEX } from "src/constants";
import { ItemTrans } from "src/dataStore/itemTrans";
import { TextDirection } from "src/utils/TextDirection";
import { getObsidianRtlSetting } from "src/utils/obsidian-hacks";
import { t } from "src/lang/helpers";
import { TagService } from "src/core/services/TagService";
import { handleError, tryAsync } from "src/utils/ErrorHandler";
import type SRPlugin from "src/main";

export class NoteOperations {
    constructor(private plugin: SRPlugin) {}

    async loadNote(noteFile: TFile): Promise<Note | null> {
        const result = await tryAsync(async () => {
            const loader: NoteFileLoader = new NoteFileLoader(this.plugin.data.settings);
            const srFile: ISRFile = this.createSrTFile(noteFile);
            const folderTopicPath: TopicPath = TopicPath.getFolderPathFromFilename(
                srFile,
                this.plugin.data.settings,
            );

            const note: Note = await loader.load(
                this.createSrTFile(noteFile),
                this.getObsidianRtlSetting(),
                folderTopicPath,
            );

            if (note) {
                ItemTrans.updateCardsSchedbyItems(note, folderTopicPath);
                note.createMultiCloze(this.plugin.data.settings);
                if (note.hasChanged) {
                    await note.writeNoteFile(this.plugin.data.settings);
                }
            }

            return note;
        });

        if (result.ok) {
            return result.value;
        }

        const error = (result as { ok: false; error: Error }).error;
        handleError(error, `Failed to load note: ${noteFile.path}`, {
            logLevel: "warn",
        });
        return null;
    }

    createSrTFile(note: TFile): SrTFile {
        return new SrTFile(this.plugin.app.vault, this.plugin.app.metadataCache, note);
    }

    private getObsidianRtlSetting(): TextDirection {
        return getObsidianRtlSetting(this.plugin.app);
    }

    tagCheck(note: TFile): boolean {
        const plugin = this.plugin;
        const fileCachedData = plugin.app.metadataCache.getFileCache(note) || {};
        const tags = getAllTags(fileCachedData) || [];

        if (TagService.isPathInNoteIgnoreFolder(plugin.data.settings, note.path)) {
            new Notice(t("NOTE_IN_IGNORED_FOLDER"));
            return false;
        }

        let shouldIgnore = true;
        for (const tag of tags) {
            if (
                plugin.data.settings.tagsToReview.some(
                    (tagToReview) => tag === tagToReview || tag.startsWith(tagToReview + "/"),
                )
            ) {
                shouldIgnore = false;
                break;
            }
        }

        if (shouldIgnore) {
            new Notice(t("PLEASE_TAG_NOTE"));
            return false;
        }
        return true;
    }

    noteIsNew(note: TFile): boolean {
        const fileCachedData = this.plugin.app.metadataCache.getFileCache(note) || {};
        const frontmatter: FrontMatterCache | Record<string, unknown> =
            fileCachedData.frontmatter || {};
        return !(
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-due") &&
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-interval") &&
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-ease")
        );
    }

    async saveReviewResponse(
        note: TFile,
        response: ReviewResponse,
        ease: number,
    ): Promise<{ sNote: SchedNote; buryList: string[] }> {
        const plugin = this.plugin;
        const fileCachedData = plugin.app.metadataCache.getFileCache(note) || {};
        const frontmatter: FrontMatterCache | Record<string, unknown> =
            fileCachedData.frontmatter || {};

        let fileText: string = await plugin.app.vault.read(note);
        let interval: number, delayBeforeReview: number;
        const now: number = Date.now();

        // new note
        if (this.noteIsNew(note)) {
            ease = plugin.linkRank.getContribution(note, plugin.easeByPath).ease;
            ease = Math.round(ease);
            interval = 1.0;
            delayBeforeReview = 0;
        } else {
            interval = frontmatter["sr-interval"];
            ease = frontmatter["sr-ease"];
            delayBeforeReview =
                now -
                window
                    .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                    .valueOf();
        }

        const schedObj: Record<string, number> = schedule(
            response,
            interval,
            ease,
            delayBeforeReview,
            plugin.data.settings,
            plugin.reviewManager.dueDatesNotes,
        );
        interval = schedObj.interval;
        ease = schedObj.ease;

        const due = window.moment(now + interval * 24 * 3600 * 1000);
        const dueString: string = due.format("YYYY-MM-DD");

        // check if scheduling info exists
        if (SCHEDULING_INFO_REGEX.test(fileText)) {
            const schedulingInfo = SCHEDULING_INFO_REGEX.exec(fileText);
            fileText = fileText.replace(
                SCHEDULING_INFO_REGEX,
                `---\n${schedulingInfo[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n` +
                    `${schedulingInfo[5]}---\n`,
            );
        } else if (YAML_FRONT_MATTER_REGEX.test(fileText)) {
            // new note with existing YAML front matter
            const existingYaml = YAML_FRONT_MATTER_REGEX.exec(fileText);
            fileText = fileText.replace(
                YAML_FRONT_MATTER_REGEX,
                `---\n${existingYaml[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n---`,
            );
        } else {
            fileText =
                `---\nsr-due: ${dueString}\nsr-interval: ${interval}\n` +
                `sr-ease: ${ease}\n---\n\n${fileText}`;
        }

        await plugin.app.vault.modify(note, fileText);

        const buryList: string[] = [];
        if (plugin.data.settings.burySiblingCardsByNoteReview) {
            const noteX: Note = await this.loadNote(note);
            for (const question of noteX.questionList) {
                buryList.push(question.questionText.textHash);
            }
            await plugin.savePluginData();
        }
        const snote: SchedNote = { note, dueUnix: due.valueOf() };
        return { sNote: snote, buryList };
    }
}
