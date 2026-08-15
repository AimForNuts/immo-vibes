import { describe, expect, it } from "vitest";
import {
  parseIntegerArrayField,
  parseNonNegativeIntegerField,
  parsePositiveInteger,
  parsePositiveIntegerField,
  parseStringField,
  readJsonObject,
} from "@/lib/validation/api";

describe("API validation helpers", () => {
  it("parses JSON objects and rejects malformed or non-object bodies", async () => {
    await expect(readJsonObject(new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    }))).resolves.toEqual({ ok: true, data: { ok: true } });

    await expect(readJsonObject(new Request("https://example.test", {
      method: "POST",
      body: "[1,2,3]",
    }))).resolves.toEqual({ ok: false, message: "JSON body must be an object" });

    await expect(readJsonObject(new Request("https://example.test", {
      method: "POST",
      body: "{not json",
    }))).resolves.toEqual({ ok: false, message: "Invalid JSON body" });
  });

  it("validates positive integer path params", () => {
    expect(parsePositiveInteger("42", "id")).toEqual({ ok: true, data: 42 });
    expect(parsePositiveInteger("0", "id")).toEqual({ ok: false, message: "id must be a positive integer" });
    expect(parsePositiveInteger("1.5", "id")).toEqual({ ok: false, message: "id must be a positive integer" });
    expect(parsePositiveInteger("abc", "id")).toEqual({ ok: false, message: "id must be a positive integer" });
  });

  it("validates string fields with trimming and minimum length", () => {
    expect(parseStringField({ name: " Bluebell " }, "name", { required: true })).toEqual({
      ok: true,
      data: "Bluebell",
    });
    expect(parseStringField({ name: " " }, "name", { required: true })).toEqual({
      ok: false,
      message: "name is required",
    });
    expect(parseStringField({ newPassword: "short" }, "newPassword", { minLength: 8 })).toEqual({
      ok: false,
      message: "newPassword must be at least 8 characters",
    });
  });

  it("validates numeric body fields", () => {
    expect(parseNonNegativeIntegerField({ levelRequired: 0 }, "levelRequired", { required: true })).toEqual({
      ok: true,
      data: 0,
    });
    expect(parseNonNegativeIntegerField({ levelRequired: 1.2 }, "levelRequired")).toEqual({
      ok: false,
      message: "levelRequired must be a non-negative integer",
    });
    expect(parsePositiveIntegerField({ tier: 1 }, "tier")).toEqual({ ok: true, data: 1 });
    expect(parsePositiveIntegerField({ tier: 0 }, "tier")).toEqual({
      ok: false,
      message: "tier must be a positive integer",
    });
  });

  it("rejects invalid entries in integer arrays instead of filtering them", () => {
    expect(parseIntegerArrayField({ zone_ids: [1, 2] }, "zone_ids")).toEqual({
      ok: true,
      data: [1, 2],
    });
    expect(parseIntegerArrayField({ zone_ids: [1, "2"] }, "zone_ids")).toEqual({
      ok: false,
      message: "zone_ids must be an array of positive integers",
    });
  });
});
