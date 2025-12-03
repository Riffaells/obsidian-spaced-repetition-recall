import { App, DataAdapter, MetadataCache, Vault } from "obsidian";

export abstract class IAdapter {
    metadataCache: MetadataCache;
    adapter: DataAdapter;
    vault: Vault;
    app: App;

    private static _instance: IAdapter;

    protected constructor(app: App) {
        this.app = app;
        IAdapter._instance = this;
    }

    static get instance() {
        if (IAdapter._instance) {
            return IAdapter._instance;
        } else {
            throw Error("there is not IAdapter instance.");
        }
    }

    static create(app: App) {
        return new ObAdapter(app);
    }
}

class ObAdapter extends IAdapter {
    constructor(app: App) {
        super(app);
        this.metadataCache = app.metadataCache;
        this.adapter = app.vault.adapter;
        this.vault = app.vault;
    }
}
