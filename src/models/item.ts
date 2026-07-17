// src/models/item.ts
export const ITEM_TYPES = ["note", "snippet", "task", "link"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type ItemMeta = {
  sourceUrl?: string;
  createdFrom: "manual" | "selection";
};

export type Item = {
  id: string;
  projectId: string;
  type: ItemType;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  meta: ItemMeta;
};
