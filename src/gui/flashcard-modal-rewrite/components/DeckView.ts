import { t } from "src/lang/helpers";
import { Deck } from "src/core/models/Deck";
import { COLLAPSE_ICON } from "src/constants";
import { DeckStats } from "src/gui/flashcard-modal-rewrite/types";

export interface IDeckView {
    render(decks: Deck[], statsGetter: (deck: Deck) => DeckStats): void;
    show(): void;
    hide(): void;
    onDeckSelected(callback: (deck: Deck) => void): void;
    destroy(): void;
}

export class DeckView implements IDeckView {
    private contentEl: HTMLElement;
    private view: HTMLDivElement;
    private header: HTMLDivElement;
    private title: HTMLDivElement;
    private stats: HTMLDivElement;
    private treeContainer: HTMLDivElement;

    // Callbacks
    private deckSelectedCallback: (deck: Deck) => void;

    // State
    private shouldExpandAll: boolean = false;

    constructor(contentEl: HTMLElement) {
        this.contentEl = contentEl;
        this.init();
    }

    private init(): void {
        this.view = this.contentEl.createDiv();
        this.view.addClasses(["sr-deck-list", "sr-is-hidden"]);

        this.header = this.view.createDiv();
        this.header.addClass("sr-header");

        this.title = this.header.createDiv();
        this.title.addClass("sr-title");
        this.title.setText(t("DECKS"));

        this.stats = this.header.createDiv();
        this.stats.addClass("sr-header-stats-container");

        this.treeContainer = this.view.createDiv();
        this.treeContainer.addClass("sr-content");
    }

    render(decks: Deck[], statsGetter: (deck: Deck) => DeckStats): void {
        // Render global stats (root deck)
        // Assuming the first deck or we compute total?
        // In original DeckUI, it calls reviewSequencer.getDeckStats(TopicPath.emptyPath) for header.
        // We'll assume the caller passes a way to get stats.

        // Clear content
        this.treeContainer.empty();

        // Render header stats (can be optional if not passed, but let's assume root stats via empty deck check or passed separate?)
        // The interface says render(decks, statsGetter). We can get root stats if we assume decks contains root or we just sum?
        // Actually, existing implementation iterates over subdecks of originalDeckTree.

        // Let's render the tree
        for (const deck of decks) {
            this._createTree(deck, this.treeContainer, statsGetter);
        }
    }

    // Explicitly for updates
    updateStats(stats: DeckStats): void {
        this.stats.empty();
        this._createHeaderStatsContainer(t("DUE_CARDS"), stats.dueCount, "sr-bg-green");
        this._createHeaderStatsContainer(t("NEW_CARDS"), stats.newCount, "sr-bg-blue");
        this._createHeaderStatsContainer(t("TOTAL_CARDS"), stats.totalCount, "sr-bg-red");
    }

    show(): void {
        this.view.removeClass("sr-is-hidden");
    }

    hide(): void {
        this.view.addClass("sr-is-hidden");
    }

    onDeckSelected(callback: (deck: Deck) => void): void {
        this.deckSelectedCallback = callback;
    }

    destroy(): void {
        this.view.remove();
    }

    private _createHeaderStatsContainer(label: string, value: number, colorClass: string): void {
        const statsContainer = this.stats.createDiv();
        statsContainer.ariaLabel = label;
        statsContainer.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-header-stats-count",
            colorClass,
        ]);

        const labelDiv = statsContainer.createDiv();
        labelDiv.setText(label + ":");

        const numberDiv = statsContainer.createDiv();
        numberDiv.setText(value.toString());
    }

    private _createTree(
        deck: Deck,
        container: HTMLElement,
        statsGetter: (deck: Deck) => DeckStats,
    ): void {
        const deckTree: HTMLElement = container.createDiv("tree-item sr-tree-item-container");
        const deckTreeSelf: HTMLElement = deckTree.createDiv(
            "tree-item-self tag-pane-tag is-clickable sr-tree-item-row",
        );

        let collapsed = !this.shouldExpandAll;
        let collapseIconEl: HTMLElement | null = null;

        if (deck.subdecks.length > 0) {
            collapseIconEl = deckTreeSelf.createDiv("tree-item-icon collapse-icon");
            collapseIconEl.innerHTML = COLLAPSE_ICON;
            if (collapsed) {
                collapseIconEl.addClass("sr-collapsed");
            }
        }

        const deckTreeInner: HTMLElement = deckTreeSelf.createDiv("tree-item-inner");
        const deckTreeInnerText: HTMLElement = deckTreeInner.createDiv("tag-pane-tag-text");
        deckTreeInnerText.innerHTML += `<span class="tag-pane-tag-self">${deck.deckName}</span>`;

        const deckTreeOuter: HTMLDivElement = deckTreeSelf.createDiv();
        deckTreeOuter.addClasses(["tree-item-flair-outer", "sr-tree-stats-container"]);

        const deckStats = statsGetter(deck);
        this._createStats(deckStats, deckTreeOuter);

        const deckTreeChildren: HTMLElement = deckTree.createDiv("tree-item-children");
        if (collapsed) {
            deckTreeChildren.addClass("sr-hidden");
        }

        if (deck.subdecks.length > 0 && collapseIconEl) {
            collapseIconEl.addEventListener("click", (e) => {
                collapsed = !collapsed;
                collapseIconEl!.toggleClass("sr-collapsed", collapsed);
                deckTreeChildren.toggleClass("sr-hidden", collapsed);
                e.stopPropagation();
            });
        }

        deckTreeSelf.addEventListener("click", () => {
            if (this.deckSelectedCallback) {
                this.deckSelectedCallback(deck);
            }
        });

        for (const subdeck of deck.subdecks) {
            this._createTree(subdeck, deckTreeChildren, statsGetter);
        }
    }

    private _createStats(statistics: DeckStats, statsWrapper: HTMLDivElement) {
        statsWrapper.empty();
        this._createStatsContainerSimple(
            t("DUE_CARDS"),
            statistics.dueCount,
            "sr-bg-green",
            statsWrapper,
        );
        this._createStatsContainerSimple(
            t("NEW_CARDS"),
            statistics.newCount,
            "sr-bg-blue",
            statsWrapper,
        );
        this._createStatsContainerSimple(
            t("TOTAL_CARDS"),
            statistics.totalCount,
            "sr-bg-red",
            statsWrapper,
        );
    }

    private _createStatsContainerSimple(
        label: string,
        value: number,
        colorClass: string,
        statsWrapper: HTMLDivElement,
    ): void {
        const statsContainer = statsWrapper.createDiv();
        statsContainer.ariaLabel = label;
        statsContainer.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            colorClass,
        ]);
        statsContainer.setText(value.toString());
    }

    setExpandAll(expand: boolean): void {
        this.shouldExpandAll = expand;
    }
}
