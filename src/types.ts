export type DataMode = "demo" | "live";

export interface ActivityAccount {
  displayName: string;
  username: string;
  userId?: string;
}

export interface ActivityDataset {
  schemaVersion: 1;
  mode: DataMode;
  account: ActivityAccount;
  timeZone: string;
  lastCheckedAt: string | null;
  latestPostAt: string | null;
  latestPostId: string | null;
  days: Record<string, string[]>;
}

export interface CalendarCell {
  date: string;
  dayOfMonth: number;
  inYear: boolean;
  weekIndex: number;
  weekday: number;
  postIds: string[];
}

export interface MonthMarker {
  label: string;
  weekIndex: number;
}
