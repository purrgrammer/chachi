import { describe, it, expect } from "vitest";

// Mock types for testing without full NDK setup
interface CompactLastSeenEntry {
  g: string;
  k: number;
  t: number;
  r?: string;
}

interface LegacyLastSeenEntry {
  group: string;
  kind: number;
  created_at: number;
  tag: string;
  ref: string;
}

describe("LastSeen Sync Format Compatibility", () => {
  it("compact format should be smaller than legacy format", () => {
    const legacyEntry: LegacyLastSeenEntry = {
      group: "relay.example.com'abc123def456",
      kind: 9,
      created_at: 1734567890,
      tag: "e",
      ref: "eventid64charsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    };

    const compactEntry: CompactLastSeenEntry = {
      g: "relay.example.com'abc123def456",
      k: 9,
      t: 1734567890,
      r: "eventid64charsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    };

    const legacySize = JSON.stringify([legacyEntry]).length;
    const compactSize = JSON.stringify([compactEntry]).length;

    console.log(`Legacy format: ${legacySize} bytes`);
    console.log(`Compact format: ${compactSize} bytes`);
    console.log(
      `Savings: ${legacySize - compactSize} bytes (${Math.round(((legacySize - compactSize) / legacySize) * 100)}%)`,
    );

    expect(compactSize).toBeLessThan(legacySize);
  });

  it("compact format without ref should be even smaller", () => {
    const compactWithRef: CompactLastSeenEntry = {
      g: "relay.example.com'abc123",
      k: 9,
      t: 1734567890,
      r: "eventid64chars",
    };

    const compactWithoutRef: CompactLastSeenEntry = {
      g: "relay.example.com'abc123",
      k: 9,
      t: 1734567890,
    };

    const withRefSize = JSON.stringify([compactWithRef]).length;
    const withoutRefSize = JSON.stringify([compactWithoutRef]).length;

    console.log(`With ref: ${withRefSize} bytes`);
    console.log(`Without ref: ${withoutRefSize} bytes`);
    console.log(`Ref field adds: ${withRefSize - withoutRefSize} bytes`);

    expect(withoutRefSize).toBeLessThan(withRefSize);
  });

  it("should calculate realistic savings for multiple groups", () => {
    const groups = [10, 50, 100, 200, 500];

    console.log("\nSize comparison for different group counts:");
    console.log("Groups | Legacy  | Compact | Savings");
    console.log("-------|---------|---------|--------");

    groups.forEach((count) => {
      const legacyEntries = Array.from({ length: count }, (_, i) => ({
        group: `relay${i}.example.com'group${i}`,
        kind: 9,
        created_at: 1734567890 + i,
        tag: "e",
        ref: `eventid${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
      }));

      const compactEntries = Array.from({ length: count }, (_, i) => ({
        g: `relay${i}.example.com'group${i}`,
        k: 9,
        t: 1734567890 + i,
        r: `eventid${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
      }));

      const legacySize = JSON.stringify(legacyEntries).length;
      const compactSize = JSON.stringify(compactEntries).length;
      const savings = legacySize - compactSize;
      const percent = Math.round((savings / legacySize) * 100);

      console.log(
        `${count.toString().padStart(6)} | ${(legacySize / 1024).toFixed(2).padStart(6)} KB | ${(compactSize / 1024).toFixed(2).padStart(6)} KB | ${(savings / 1024).toFixed(2)} KB (${percent}%)`,
      );
    });
  });
});
