// src/models/item.ts
export type ItemType = "note" | "snippet" | "task" | "link";

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
