import { TFile } from "obsidian";
import type SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/ReviewDeck";
import { t } from "src/lang/helpers";
import { NoteGroupComponent } from "./NoteGroupComponent";
import { FilterType, NoteSortType } from "./types";
import { calculateDaysUntilDue, createGroupKey, getGroupTitle, isNoteActive } from "./utils";

export class DeckComponent {
    private readonly plugin: SRPlugin;
    private deck: ReviewDeck;
    private containerEl: HTMLElement;
    private activeFile: TFile | null;
    private filter: FilterType;
    private expandedDecks: Set<string>;
    private expandedGroups: Set<string>;
    private shouldAutoExpand: boolean;
    private onToggleDeck: (deckName: string) => void;
    private onToggleGroup: (groupKey: string) => void;
    private groupComponents: Map<string, NoteGroupComponent> = new Map();
    private deckEl: HTMLElement | null = null;
    private headerClickHandler: (() => void) | null = null;
    private noteSort: NoteSortType;

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
        noteSort: NoteSortType,
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
        this.noteSort = noteSort;
    }

    public render(): HTMLElement | null {
        if (!this.deck || (!this.deck.newNotes?.length && !this.deck.scheduledNotes?.length)) {
            this.removeElement();
            return null;
        }

        // Аre there any "active" notes?
        if (this.filter === FilterType.ACTIVE) {
            const hasActiveNotes = this.checkIfDeckHasActiveNotes();
            if (!hasActiveNotes) {
                this.removeElement();
                return null;
            }
        }

        // are there any "revied" notes?
        if (this.filter === FilterType.REVIEWED) {
            const hasReviewedNotes = this.checkIfDeckHasReviewedNotes();
            if (!hasReviewedNotes) {
                this.removeElement();
                return null;
            }
        }

        if (this.shouldAutoExpand) {
            const hasActiveFile = this.checkIfDeckContainsActiveFile();
            if (hasActiveFile) {
                this.expandedDecks.add(this.deck.deckName);
            }
        }

        if (!this.deckEl) {
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

            header.addEventListener("click", this.headerClickHandler, {
                signal: this.abortController.signal,
            });

            this.reconcileGroups(content);
        } else {
            // Ensure listeners are attached if for some reason they were lost (unlikely if we just reuse)
            // But we do need to return the element.
            // We rely on update() to have updated the content.
        }

        return this.deckEl;
    }

    private removeElement(): void {
        if (this.deckEl) {
            if (this.headerClickHandler) {
                const header = this.deckEl.querySelector(".sr-new-deck-header");
                if (header) {
                    header.removeEventListener("click", this.headerClickHandler);
                }
                this.headerClickHandler = null;
            }
            this.deckEl.remove();
            this.deckEl = null;
        }
    }

    public update(
        activeFile: TFile | null,
        filter: FilterType,
        shouldAutoExpand: boolean,
        noteSort: NoteSortType,
        deck?: ReviewDeck,
    ): void {
        this.activeFile = activeFile;
        this.filter = filter;
        this.shouldAutoExpand = shouldAutoExpand;
        this.noteSort = noteSort;

        // Update deck reference if provided
        if (deck) {
            this.deck = deck;
        }

        // START of checks from render()
        if (!this.deck || (!this.deck.newNotes?.length && !this.deck.scheduledNotes?.length)) {
            this.removeElement();
            return;
        }

        // Аre there any "active" notes?
        if (this.filter === FilterType.ACTIVE) {
            const hasActiveNotes = this.checkIfDeckHasActiveNotes();
            if (!hasActiveNotes) {
                this.removeElement();
                return;
            }
        }

        // are there any "revied" notes?
        if (this.filter === FilterType.REVIEWED) {
            const hasReviewedNotes = this.checkIfDeckHasReviewedNotes();
            if (!hasReviewedNotes) {
                this.removeElement();
                return;
            }
        }
        
        // If element was removed by filter, but now should be visible, we must re-render it.
        if (!this.deckEl) {
             this.render(); // This will create it if needed
             if (!this.deckEl) {
                // Still null, so must be empty after all, so do nothing.
                return;
             }
        }

        // Auto-expand deck if it contains the active file
        if (this.shouldAutoExpand) {
            const hasActiveFile = this.checkIfDeckContainsActiveFile();
            if (hasActiveFile) {
                this.expandedDecks.add(this.deck.deckName);
            }
        }

        // Update header stats
        const header = this.deckEl.querySelector(".sr-new-deck-header");
        if (header) {
            const detailedStats = this.calculateDetailedStats();
            const stats = header.querySelector(".sr-new-deck-stats");
            if (stats) {
                stats.setText(
                    `${detailedStats.newCount} / ${detailedStats.dueCount} / ${detailedStats.reviewedCount}`,
                );
                stats.setAttribute(
                    "aria-label",
                    `${t("NEW")}: ${detailedStats.newCount}, ${t("DUE_CARDS")}: ${detailedStats.dueCount}, ${t("REVIEWED")}: ${detailedStats.reviewedCount}`,
                );
            }

            if (this.expandedDecks.has(this.deck.deckName)) {
                header.addClass("sr-deck-expanded");
            } else {
                header.removeClass("sr-deck-expanded");
            }
        }

        const content = this.deckEl.querySelector(".sr-new-deck-content") as HTMLElement;
        if (content) {
            if (this.expandedDecks.has(this.deck.deckName)) {
                content.style.display = "block";
            } else {
                content.style.display = "none";
            }

            this.reconcileGroups(content);
        }
    }

    private checkIfDeckHasActiveNotes(): boolean {
        if (this.deck.newNotes && this.deck.newNotes.length > 0) {
            return true;
        }

        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            for (const sNote of this.deck.scheduledNotes) {
                if (isNoteActive(sNote, this.plugin)) {
                    return true;
                }
            }
        }

        return false;
    }

    private checkIfDeckHasReviewedNotes(): boolean {
        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            for (const sNote of this.deck.scheduledNotes) {
                if (!isNoteActive(sNote, this.plugin)) {
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
                if (isNoteActive(sNote, this.plugin)) {
                    dueCount++;
                } else {
                    reviewedCount++;
                }
            }
        }

        return { newCount, dueCount, reviewedCount };
    }

    private reconcileGroups(content: HTMLElement): void {
        const groupsData: { title: string; notes: SchedNote[]; key: string }[] = [];

        if (
            this.filter !== FilterType.REVIEWED &&
            this.deck.newNotes &&
            this.deck.newNotes.length > 0
        ) {
            const groupKey = createGroupKey(this.deck.deckName, t("NEW"));
            if (this.shouldAutoExpand && this.checkIfGroupContainsActiveFile(this.deck.newNotes)) {
                this.expandedGroups.add(groupKey);
            }
            groupsData.push({
                title: t("NEW"),
                notes: this.deck.newNotes,
                key: groupKey,
            });
        }

        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
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
                groupsData.push({
                    title: title,
                    notes: notes,
                    key: groupKey,
                });
            }
        }

        // 3. Reconcile
        const newGroupKeys = new Set(groupsData.map((g) => g.key));

        // Remove groups that dont exist anymore or became empty
        for (const [key, component] of this.groupComponents) {
            if (!newGroupKeys.has(key)) {
                component.destroy();
                this.groupComponents.delete(key);
            }
        }

        // Create or Update groups
        for (const data of groupsData) {
            let component = this.groupComponents.get(data.key);
            if (component) {
                // Update existing component
                component.update(this.activeFile, data.notes, this.shouldAutoExpand);
            } else {
                // Only create new groups if they have notes
                if (data.notes && data.notes.length > 0) {
                    component = new NoteGroupComponent(
                        this.plugin,
                        data.title,
                        data.notes,
                        this.activeFile,
                        this.deck,
                        content,
                        data.key,
                        this.expandedGroups,
                        this.shouldAutoExpand,
                        this.onToggleGroup,
                        this.noteSort,
                    );
                    const rendered = component.render();
                    if (rendered) {
                        this.groupComponents.set(data.key, component);
                    }
                }
            }
        }
    }

    private checkIfGroupContainsActiveFile(notes: SchedNote[]): boolean {
        if (!this.activeFile || !notes) return false;

        for (const note of notes) {
            if (note.note && note.note.path === this.activeFile.path) {
                return true;
            }
        }

        return false;
    }

    private abortController = new AbortController();

    public destroy(): void {
        for (const group of this.groupComponents.values()) {
            group.destroy();
        }
        this.groupComponents.clear();

        this.abortController.abort();
        this.headerClickHandler = null;

        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }
    }
}