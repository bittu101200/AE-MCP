# After Effects MCP Implementation Guide For Coding LLMs

This repository is being migrated toward a more complete, contract-driven After Effects MCP server. The current implementation now includes the first vertical slice of that plan:

- standardized TypeScript contract modules for AE responses and property paths
- bridge payload normalization on the Node side
- a bridge health tool
- canonical property-path-aware inspection/value tools
- project/composition introspection tools

## What Exists Now

### Contract Modules
- `src/contracts/ae-response.ts`
- `src/contracts/property-path.ts`

### Bridge Modules
- `src/bridge/normalize.ts`
- `src/bridge/property-schemas.ts`
- `src/bridge/health.ts`

### New MCP Tools
- `bridge-health`
- `inspect-property-tree`
- `list-project-items`
- `get-project-item-info`
- `get-composition-settings`
- `get-property-metadata`
- `get-property-value`
- `set-property-value`
- `get-expression`

### First Slice Completion Notes
- `set-property-value` now supports time-varying properties by falling back to `setValueAtTime()` when a target property already has keyframes, or when a `time` argument is provided.
- `get-active-comp` now emits the normalized response envelope from the ExtendScript side.
- Text document writes and shape color writes are part of the validated first-slice surface area.

## Contract Expectations

### Response Envelope
Newer tools should return a payload shaped like:

```json
{
  "status": "success",
  "command": "getPropertyValue",
  "timestamp": "2026-03-28T00:00:00Z",
  "data": {}
}
```

Legacy bridge payloads are normalized by Node into this envelope when possible.

### Property Paths
Use canonical property paths when working with nested AE DOM properties.

Accepted inputs:
- `propertyPath`: structured object with `segments`
- `propertyPathString`: shorthand like `Transform.Position`
- `propertyName`: legacy simple property name for shallow lookups

Canonical form:

```json
{
  "segments": [
    { "matchName": "ADBE Transform Group" },
    { "matchName": "ADBE Position" }
  ]
}
```

## Recommended LLM Workflow

Always use this sequence when mutating AE:

1. Inspect target layer or property tree.
2. Capture the canonical `propertyPath` returned by inspection.
3. Read metadata or current value.
4. Perform mutation.
5. Re-read the property to verify the mutation.

Recommended tool order:
- `get-active-comp`
- `getLayerInfo`
- `inspect-property-tree`
- `get-property-metadata`
- `get-property-value`
- `set-property-value`
- `get-property-value` again for verification

## Current Limitations

- Existing legacy tools are not fully migrated to the new response envelope yet.
- Property-path resolution is implemented for the high-value inspection/value slice, not every legacy command.
- Some AE value types are only partially serialized.
- Transport remains file-based and single-command oriented.
- After updating `mcp-bridge-auto.jsx`, the installed AE ScriptUI panel must be recopied/reloaded before live behavior reflects bridge-side changes.

## Recommended Next Implementation Steps

1. Migrate more legacy tools to shared response envelopes.
2. Expand project item mutation tools.
3. Add composition mutation tools using the new contracts.
4. Expand value serialization for more AE-specific object types.
5. Continue modularizing `src/index.ts` around proven patterns.
