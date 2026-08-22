export interface DungeonLootItem {
  hashed_item_id: string;
  name: string;
  image_url: string | null;
  quality: string;
  quantity: number;
  chance: number;
}

export interface ItemEffect {
  attribute: string;
  target: string;
  value: number;
  value_type: string;
  duration_ms?: number | null;
}

export interface ItemRecipe {
  skill: string;
  level_required: number;
  max_uses: number;
  materials: Array<{
    hashed_item_id: string;
    item_name: string;
    quantity: number;
  }>;
  result: { hashed_item_id: string; item_name: string } | null;
}

export interface ZoneEnemy {
  id: number;
  name: string;
  level: number;
  drops: string[];
}

export interface ZoneDungeon {
  id: number;
  name: string;
  drops?: string[];
}

export interface ZoneWorldBoss {
  id: number;
  name: string;
  drops?: string[];
}

export type DashboardCardType =
  | "characters"
  | "gear"
  | "skills"
  | "economy"
  | "dungeons"
  | "guild"
  | "empty";

export const DEFAULT_DASHBOARD_LAYOUT: DashboardCardType[] = [
  "characters",
  "gear",
  "empty",
  "empty",
  "empty",
  "empty",
];

export type SyncJobLogDetails = Record<string, unknown>;

export type ApiInspectorParam = {
  name: string;
  source: "path" | "query";
  type: "string" | "number" | "boolean";
  required: boolean;
  testValues: Array<string | number | boolean>;
  defaultTestValue?: string | number | boolean;
  notes?: string;
};

export type ApiInspectorSpecConfig = {
  key: string;
  label: string;
  method: "GET";
  pathTemplate: string;
  params: ApiInspectorParam[];
  notes?: string;
};

export type ApiInspectorSchema = Record<string, unknown> | string | number | boolean | null | unknown[];
