// tests/unit/__mocks__/obsidian.ts

export const moment = jest.fn(() => {
    return {
        format: jest.fn(() => "2023-10-26"),
        locale: jest.fn(),
    };
});

export class TFile {
    path: string;
    basename: string;
    extension: string;

    constructor(path: string, basename: string, extension: string) {
        this.path = path;
        this.basename = basename;
        this.extension = extension;
    }
}

export class TFolder {
    path: string;
    name: string;

    constructor(path: string, name: string) {
        this.path = path;
        this.name = name;
    }
}

export class Vault {
    read(file: TFile) {
        return Promise.resolve("file content");
    }

    getAbstractFileByPath(path: string) {
        return new TFile(path, "basename", "md");
    }
}

export class Notice {
    constructor(message: string) {}
}

export function getAllTags(cache: any): string[] {
    return [];
}
