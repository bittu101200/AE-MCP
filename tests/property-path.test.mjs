import test from "node:test";
import assert from "node:assert/strict";

import { parsePropertyPath, stringifyPropertyPath } from "../build/contracts/property-path.js";
import { createBridgeTimeoutResponse, normalizeBridgePayload } from "../build/bridge/normalize.js";

test("parsePropertyPath parses dotted shorthand", () => {
  const parsed = parsePropertyPath("Transform.Position");
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0].name, "Transform");
  assert.equal(parsed.segments[1].name, "Position");
});

test("parsePropertyPath parses tagged segments", () => {
  const parsed = parsePropertyPath("matchName:ADBE Transform Group > matchName:ADBE Position");
  assert.equal(parsed.segments[0].matchName, "ADBE Transform Group");
  assert.equal(parsed.segments[1].matchName, "ADBE Position");
  assert.equal(
    stringifyPropertyPath(parsed),
    "matchName:ADBE Transform Group > matchName:ADBE Position",
  );
});

test("normalizeBridgePayload wraps legacy success payloads", () => {
  const normalized = normalizeBridgePayload(JSON.stringify({ status: "success", layer: { name: "Text 1" } }), "demo");
  assert.equal(normalized.status, "success");
  assert.equal(normalized.command, "demo");
  assert.equal(normalized.data.layer.name, "Text 1");
  assert.equal(normalized.meta?.legacyPayload, false);
});

test("normalizeBridgePayload maps malformed payloads to structured errors", () => {
  const normalized = normalizeBridgePayload("not-json", "demo");
  assert.equal(normalized.status, "error");
  assert.equal(normalized.error.code, "BRIDGE_MALFORMED_RESULT");
});

test("normalizeBridgePayload preserves structured envelopes", () => {
  const normalized = normalizeBridgePayload(JSON.stringify({
    status: "success",
    command: "getActiveComp",
    timestamp: "2026-03-28T00:00:00Z",
    data: { composition: { name: "Intro" } },
  }), "getActiveComp");
  assert.equal(normalized.status, "success");
  assert.equal(normalized.command, "getActiveComp");
  assert.equal(normalized.data.composition.name, "Intro");
  assert.equal(normalized.meta, undefined);
});

test("createBridgeTimeoutResponse returns structured timeout error", () => {
  const timeout = createBridgeTimeoutResponse("getPropertyValue", "cmd-1");
  assert.equal(timeout.status, "error");
  assert.equal(timeout.command, "getPropertyValue");
  assert.equal(timeout.commandId, "cmd-1");
  assert.equal(timeout.error.code, "TIMEOUT");
});

test("normalizeBridgePayload strips double-wrapped envelopes", () => {
  const doubleWrapped = JSON.stringify({
    status: "success",
    command: "getActiveComp",
    timestamp: "2026-03-28T00:00:00Z",
    data: {
      status: "success",
      command: "getActiveComp",
      timestamp: "2026-03-28T00:00:00Z",
      data: { composition: { name: "Intro" } }
    }
  });
  const normalized = normalizeBridgePayload(doubleWrapped, "getActiveComp");
  assert.equal(normalized.status, "success");
  assert.equal(normalized.command, "getActiveComp");
  assert.deepEqual(normalized.data, { composition: { name: "Intro" } });
});

test("normalizeBridgePayload handles resolver error codes", () => {
  const resolverError = JSON.stringify({
    status: "error",
    command: "moveLayer",
    timestamp: "2026-03-28T00:00:00Z",
    error: {
      code: "COMP_NOT_FOUND",
      message: "Composition not found with name 'Missing'.",
      rawMessage: "Composition not found with name 'Missing'.",
      details: { providedName: "Missing" }
    }
  });
  const normalized = normalizeBridgePayload(resolverError, "moveLayer");
  assert.equal(normalized.status, "error");
  assert.equal(normalized.error.code, "COMP_NOT_FOUND");
  assert.ok(normalized.error.details);
});

test("normalizeBridgePayload infers error codes from legacy messages", () => {
  const legacyError = JSON.stringify({
    status: "error",
    message: "Layer not found with name 'MissingLayer' in comp 'Main'."
  });
  const normalized = normalizeBridgePayload(legacyError, "deleteLayer");
  assert.equal(normalized.status, "error");
  assert.equal(normalized.error?.code, "LAYER_NOT_FOUND");
});
