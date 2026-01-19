import "obsidian";

declare module "obsidian" {
    interface MetadataCache {
        getTags(): Record<string, number>;
    }

    interface Workspace {
        on(name: "sr:note-reviewed", callback: () => any, ctx?: any): EventRef;
        on(name: "sr:stats-updated", callback: () => any, ctx?: any): EventRef;
        on(name: "sr:card-reviewed", callback: (data: any) => any, ctx?: any): EventRef;
        on(name: "sr:deck-completed", callback: (data: any) => any, ctx?: any): EventRef;
        on(name: "sr:modal-closed", callback: (data: any) => any, ctx?: any): EventRef;
        on(name: string, callback: (...data: any) => any, ctx?: any): EventRef;

        trigger(name: "sr:note-reviewed", data?: any): void;
        trigger(name: "sr:stats-updated"): void;
        trigger(name: "sr:card-reviewed", data: any): void;
        trigger(name: "sr:deck-completed", data: any): void;
        trigger(name: "sr:modal-closed", data: any): void;
        trigger(name: string, ...data: any[]): void;
    }

    interface App {
        plugins: {
            getPlugin(id: string): any;
            enabledPlugins: Set<string>;
            manifests: Record<string, any>;
            disablePlugin?(id: string): Promise<void>;
            enablePlugin?(id: string): Promise<void>;
        };
        keymap: {
            pushScope(scope: Scope): void;
            popScope(scope: Scope): void;
        };
        dom: {
            appContainerEl: HTMLElement;
        };
        commands: {
            executeCommandById(id: string): boolean;
        };
    }
}
