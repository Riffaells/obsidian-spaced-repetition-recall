export enum FilterType {
    ALL = "all",
    ACTIVE = "active",
    REVIEWED = "reviewed",
}

export interface SidebarStats {
    totalDue: number;
    totalNew: number;
}
