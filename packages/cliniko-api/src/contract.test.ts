import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getMissingRequiredPaths, type OpenApiSpecLike } from "./index";

describe("openapi contract", () => {
  it("contains required Cliniko integration paths", async () => {
    const fileUrl = new URL("../openapi/cliniko.openapi.sample.json", import.meta.url);
    const spec = JSON.parse(await readFile(fileUrl, "utf8")) as OpenApiSpecLike;
    expect(getMissingRequiredPaths(spec)).toEqual([]);
  });
});
