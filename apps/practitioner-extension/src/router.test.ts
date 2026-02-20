import { describe, expect, it } from "vitest";
import { qk } from "@cliniko-companion/cache";

describe("timeline key", () => {
  it("uses patient timeline namespace", () => {
    expect(qk.timeline("pat_123", { pageSize: 30 })).toEqual(["patient", "pat_123", "timeline", { pageSize: 30 }]);
  });
});
