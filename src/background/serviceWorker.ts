// src/background/serviceWorker.ts
import { openDb } from "../storage/idb/openDb";

console.log("[SW] loaded");
openDb();
