export enum FilterType {
    ALL = "all",
    ACTIVE = "active",
    REVIEWED = "reviewed",
}

export enum SortType {
    DATE_ASC = "date_asc",
    DATE_DESC = "date_desc",
    COUNT_ASC = "count_asc",
    COUNT_DESC = "count_desc",
    NAME_ASC = "name_asc",
    NAME_DESC = "name_desc",
}

export enum NoteSortType {
    DEFAULT = "default",
    NAME_ASC = "name_asc",
    NAME_DESC = "name_desc",
    PATH_ASC = "path_asc",
    PATH_DESC = "path_desc",
}

export enum SidebarViewMode {
    Notes = "notes",
    FlashCards = "flashcards",
}

export interface SidebarStats {
    totalDue: number;
    totalNew: number;
}
