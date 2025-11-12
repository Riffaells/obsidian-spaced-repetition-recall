import { TFile } from "obsidian";
import type SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/ReviewDeck";
import { t } from "src/lang/helpers";
import { NoteGroupComponent } from "./NoteGroupComponent";
import { FilterType } from "./types";
import { calculateDaysUntilDue, createGroupKey, getGroupTitle } from "./utils";

export class DeckComponent {
    private plugin: SRPlugin;
    private deck: ReviewDeck;
    private containerEl: HTMLElement;
    private activeFile: TFile | null;
    private filter: FilterType;
    private expandedDecks: Set<string>;
    private expandedGroups: Set<string>;
    private shouldAutoExpand: boolean;
    private onToggleDeck: (deckName: string) => void;
    private onToggleGroup: (groupKey: string) => void;
    private groupComponents: NoteGroupComponent[] = [];
    private deckEl: HTMLElement | null = null;
    private headerClickHandler: (() => void) | null = null;

    constructor(
        plugin: SRPlugin,
        deck: ReviewDeck,
        containerEl: HTMLElement,
        activeFile: TFile | null,
        filter: FilterType,
        expandedDecks: Set<string>,
        expandedGroups: Set<string>,
        shouldAutoExpand: boolean,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ) {
        this.plugin = plugin;
        this.deck = deck;
        this.containerEl = containerEl;
        this.activeFile = activeFile;
        this.filter = filter;
        this.expandedDecks = expandedDecks;
        this.expandedGroups = expandedGroups;
        this.shouldAutoExpand = shouldAutoExpand;
        this.onToggleDeck = onToggleDeck;
        this.onToggleGroup = onToggleGroup;
    }

    public render(): HTMLElement | null {
        if (!this.deck || (!this.deck.newNotes?.length && !this.deck.scheduledNotes?.length)) {
            return null;
        }

        // Аre there any "active" notes?
        if (this.filter === FilterType.ACTIVE) {
            const hasActiveNotes = this.checkIfDeckHasActiveNotes();
            if (!hasActiveNotes) {
                return null;
            }
        }

        // are there any "revied" notes?
        if (this.filter === FilterType.REVIEWED) {
            const hasReviewedNotes = this.checkIfDeckHasReviewedNotes();
            if (!hasReviewedNotes) {
                return null;
            }
        }

        if (this.shouldAutoExpand) {
            const hasActiveFile = this.checkIfDeckContainsActiveFile();
            if (hasActiveFile) {
                this.expandedDecks.add(this.deck.deckName);
            }
        }

        this.deckEl = this.containerEl.createDiv("sr-new-deck");

        const isExpanded = this.expandedDecks.has(this.deck.deckName);
        const header = this.renderHeader(this.deckEl, isExpanded);
        const content = this.deckEl.createDiv("sr-new-deck-content");

        if (!isExpanded) {
            content.style.display = "none";
        }

        this.headerClickHandler = () => {
            this.onToggleDeck(this.deck.deckName);
        };

        header.addEventListener("click", this.headerClickHandler);

        this.renderContent(content);

        return this.deckEl;
    }

    private checkIfDeckHasActiveNotes(): boolean {
        if (this.deck.newNotes && this.deck.newNotes.length > 0) {
            return true;
        }

        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            for (const sNote of this.deck.scheduledNotes) {
                const nDays = calculateDaysUntilDue(sNote.dueUnix, this.plugin);
                if (nDays <= 0) {
                    return true;
                }
            }
        }

        return false;
    }

    private checkIfDeckHasReviewedNotes(): boolean {
        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            for (const sNote of this.deck.scheduledNotes) {
                const nDays = calculateDaysUntilDue(sNote.dueUnix, this.plugin);
                if (nDays > 0) {
                    return true;
                }
            }
        }

        return false;
    }

    private checkIfDeckContainsActiveFile(): boolean {
        if (!this.activeFile) return false;

        if (this.deck.newNotes) {
            for (const note of this.deck.newNotes) {
                if (note.note.path === this.activeFile.path) {
                    return true;
                }
            }
        }

        if (this.deck.scheduledNotes) {
            for (const note of this.deck.scheduledNotes) {
                if (note.note.path === this.activeFile.path) {
                    return true;
                }
            }
        }

        return false;
    }

    private renderHeader(deckEl: HTMLElement, isExpanded: boolean): HTMLElement {
        const header = deckEl.createDiv("sr-new-deck-header");

        const title = header.createDiv("sr-new-deck-title");
        title.setText(this.deck.deckName);

        const stats = header.createDiv("sr-new-deck-stats");

        const detailedStats = this.calculateDetailedStats();
        stats.setText(
            `${detailedStats.newCount} / ${detailedStats.dueCount} / ${detailedStats.reviewedCount}`,
        );
        stats.setAttribute(
            "aria-label",
            `${t("NEW")}: ${detailedStats.newCount}, ${t("DUE_CARDS")}: ${detailedStats.dueCount}, ${t("REVIEWED")}: ${detailedStats.reviewedCount}`,
        );

        if (isExpanded) {
            header.addClass("sr-deck-expanded");
        }

        return header;
    }

    private calculateDetailedStats(): {
        newCount: number;
        dueCount: number;
        reviewedCount: number;
    } {
        const newCount = this.deck.newNotes?.length || 0;
        let dueCount = 0;
        let reviewedCount = 0;

        if (this.deck.scheduledNotes) {
            for (const sNote of this.deck.scheduledNotes) {
                const nDays = calculateDaysUntilDue(sNote.dueUnix, this.plugin);
                if (nDays <= 0) {
                    dueCount++;
                } else {
                    reviewedCount++;
                }
            }
        }

        return { newCount, dueCount, reviewedCount };
    }

    private renderContent(content: HTMLElement): void {
        if (
            this.filter !== FilterType.REVIEWED &&
            this.deck.newNotes &&
            this.deck.newNotes.length > 0
        ) {
            const groupKey = createGroupKey(this.deck.deckName, t("NEW"));

            if (this.shouldAutoExpand && this.checkIfGroupContainsActiveFile(this.deck.newNotes)) {
                this.expandedGroups.add(groupKey);
            }

            const newGroup = new NoteGroupComponent(
                this.plugin,
                t("NEW"),
                this.deck.newNotes,
                this.activeFile,
                this.deck,
                content,
                groupKey,
                this.expandedGroups,
                this.shouldAutoExpand,
                this.onToggleGroup,
            );
            const rendered = newGroup.render();
            if (rendered) {
                this.groupComponents.push(newGroup);
            }
        }

        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            this.renderScheduledGroups(content);
        }
    }

    private checkIfGroupContainsActiveFile(notes: any[]): boolean {
        if (!this.activeFile || !notes) return false;

        for (const note of notes) {
            if (note.note && note.note.path === this.activeFile.path) {
                return true;
            }
        }

        return false;
    }

    private renderScheduledGroups(content: HTMLElement): void {
        const maxDaysToRender = this.plugin.data.settings.maxNDaysNotesReviewQueue;
        const groupedNotes: { [key: string]: SchedNote[] } = {};

        const sortedNotes =
            this.filter === FilterType.REVIEWED
                ? [...this.deck.scheduledNotes].sort((a, b) => b.dueUnix - a.dueUnix)
                : [...this.deck.scheduledNotes].sort((a, b) => a.dueUnix - b.dueUnix);

        for (const sNote of sortedNotes) {
            const nDays = calculateDaysUntilDue(sNote.dueUnix, this.plugin);

            if (nDays > maxDaysToRender) {
                continue;
            }

            if (this.filter === FilterType.ACTIVE && nDays > 0) {
                continue;
            }

            if (this.filter === FilterType.REVIEWED && nDays <= 0) {
                continue;
            }

            const folderTitle = getGroupTitle(nDays, sNote.dueUnix, this.plugin);

            if (!groupedNotes[folderTitle]) {
                groupedNotes[folderTitle] = [];
            }
            groupedNotes[folderTitle].push(sNote);
        }

        for (const [title, notes] of Object.entries(groupedNotes)) {
            if (!notes || notes.length === 0) continue;

            const groupKey = createGroupKey(this.deck.deckName, title);

            if (this.shouldAutoExpand && this.checkIfGroupContainsActiveFile(notes)) {
                this.expandedGroups.add(groupKey);
            }

            const group = new NoteGroupComponent(
                this.plugin,
                title,
                notes,
                this.activeFile,
                this.deck,
                content,
                groupKey,
                this.expandedGroups,
                this.shouldAutoExpand,
                this.onToggleGroup,
            );
            const rendered = group.render();
            if (rendered) {
                this.groupComponents.push(group);
            }
        }
    }

    public destroy(): void {
        for (const group of this.groupComponents) {
            group.destroy();
        }
        this.groupComponents = [];

        if (this.deckEl && this.headerClickHandler) {
            const header = this.deckEl.querySelector(".sr-new-deck-header");
            if (header) {
                header.removeEventListener("click", this.headerClickHandler);
            }
            this.headerClickHandler = null;
        }

        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }
    }
}
