// @ts-nocheck
import Dexie, { Table } from "dexie";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

// todo: tweak cache sizes
export const cache = new NDKCacheAdapterDexie({
  dbName: "ndk",
});

interface Event {
  id: string;
  group: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
}

export interface LastSeen {
  group: string;
  kind: number;
  tag: string;
  ref: string;
  created_at: number;
}

class ChachiDatabase extends Dexie {
  events!: Table<Event>;
  lastSeen!: Table<LastSeen>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      events: "&id,created_at,group,[group+kind]",
      lastSeen: "[group+kind]",
    });
  }
}
const db = new ChachiDatabase("chachi");

export default db;
