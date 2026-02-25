// src/storage/idb/schema.ts
// Purpose: central, declarative contract for the IndexedDB schema.
// No IndexedDB API calls belong in this file.

//
// Database identity
//
export const DB_NAME = "aiw_db";
export const DB_VERSION = 1;

//
// Object store names
// Keep these as constants to avoid scattering magic strings across repos/migrations.
//
export const STORE_PROJECTS = "projects";
export const STORE_ITEMS = "items";

//
// Primary key paths (keyPath) for object stores
// In v0 both stores use "id" as the primary key.
//
export const KEY_PROJECTS = "id";
export const KEY_ITEMS = "id";

//
// Index names
// Index names are not field names; they are identifiers for the index itself.
//
export const IDX_ITEMS_BY_PROJECT = "by_projectId";

//
// Schema specification types
// These types exist only to keep the schema definition honest and readable.
//
// - StoreSpec.keyPath is a string because object stores in v0 use a single keyPath.
// - IndexSpec.keyPath allows string[] for future compound indexes.
//
export type IndexSpec = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};

export type StoreSpec = {
  name: string;
  keyPath: string;
  indexes: IndexSpec[];
};

export type SchemaSpec = {
  stores: StoreSpec[];
};

//
// IndexedDB schema contract (v1)
//
// This object is consumed by migrations/openDb to create missing stores/indexes.
// It is declarative on purpose: no functions, no side effects.
//
export const IDB_SCHEMA: SchemaSpec = {
  stores: [
    {
      // Projects are stored as records keyed by Project.id
      name: STORE_PROJECTS,
      keyPath: KEY_PROJECTS,
      indexes: [],
    },
    {
      // Items are stored as records keyed by Item.id
      name: STORE_ITEMS,
      keyPath: KEY_ITEMS,
      indexes: [
        {
          // Required query in v0: list items by projectId
          name: IDX_ITEMS_BY_PROJECT,
          keyPath: "projectId",
          options: { unique: false },
        },
      ],
    },
  ],
};
