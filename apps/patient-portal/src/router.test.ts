import { describe, expect, it } from "vitest";
import { qk } from "@cliniko-companion/cache";

describe("query keys", () => {
  it("builds patient summary key", () => {
    expect(qk.patientSummary("pat_123")).toEqual(["patient", "pat_123", "summary"]);
  });
});
