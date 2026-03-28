# Prompt for Claude Code: Upgrade the After Effects MCP Server

## Context

I have an existing After Effects MCP (Model Context Protocol) server that allows Claude to control After Effects via a bridge panel. I've been using it extensively and have hit **critical limitations** that make it nearly unusable for real production work. I need you to audit the entire codebase and upgrade it into a **production-grade AE automation server**.

Below is a detailed breakdown of every limitation I encountered during real usage, organized by priority, along with the exact capabilities I need added.

---

## CURRENT ARCHITECTURE (What Exists)

The MCP server communicates with After Effects through a bridge panel (CEP or UXP extension). It uses a file-based command/result exchange pattern:
- Claude sends a command → MCP writes a command file → AE bridge panel polls for commands → AE executes via ExtendScript → AE writes result file → MCP reads and returns results

### Currently Available Tools

| Tool | What It Does |
|------|-------------|
| `run-script` | Run predefined scripts: `listCompositions`, `getProjectInfo`, `getLayerInfo`, `createComposition`, `createTextLayer`, `createShapeLayer`, `createSolidLayer`, `setLayerProperties`, `setLayerKeyframe`, `setLayerExpression`, `applyEffect`, `applyEffectTemplate` |
| `get-results` | Poll for results from last command |
| `create-composition` | Create a new comp |
| `setLayerKeyframe` | Set a keyframe on a property |
| `setLayerExpression` | Set/remove expressions |
| `apply-effect` | Apply an effect by matchName |
| `apply-effect-template` | Apply from predefined templates: `gaussian-blur`, `directional-blur`, `color-balance`, `brightness-contrast`, `curves`, `glow`, `drop-shadow`, `cinematic-look`, `text-pop` |
| `test-animation` | Test keyframe/expression functionality |

### Current Limitations Summary

The server was built as a proof-of-concept and is missing fundamental capabilities that any real AE automation needs. Here is what I ran into during actual usage:

---

## PRIORITY 1: CRITICAL MISSING CAPABILITIES

### 1.1 — Layer Reordering (BIGGEST PAIN POINT)

**Problem:** There is NO way to reorder layers in the timeline. When you create a new layer (shape, solid, text), it always lands at index 1 (top of the stack). There's no `moveLayer`, `setLayerIndex`, or `reorderLayer` tool. The `setLayerProperties` script accepts a `moveToIndex` parameter but it silently does nothing.

**What I Need:**
```
Tool: moveLayer
Parameters:
  - compIndex (int): target composition
  - layerIndex (int): current layer index
  - newIndex (int): desired position in the stack
  
Implementation: Use layer.moveBefore() or layer.moveAfter() or layer.moveToBeginning()/moveToEnd() in ExtendScript.
The AE ExtendScript API supports: layer.moveBefore(otherLayer), layer.moveAfter(otherLayer), layer.moveToBeginning(), layer.moveToEnd()
```

**Why it matters:** Without layer ordering, you cannot create design elements (like glass cards, backgrounds, mattes) that need to sit BEHIND other elements. Every new layer obscures existing content. This single missing feature broke my entire glassmorphism workflow.

### 1.2 — Layer Enable/Disable (Visibility Toggle)

**Problem:** `setLayerProperties` with `enabled: false` does not work. The `getLayerInfo` response always shows `enabled: true` regardless. There is no way to toggle layer visibility (`layer.enabled` in ExtendScript).

**What I Need:**
```
Tool: setLayerVisibility
Parameters:
  - compIndex (int)
  - layerIndex (int)  
  - enabled (boolean)
  - OR add working "enabled" support to setLayerProperties
```

### 1.3 — Delete Layer

**Problem:** There is NO way to delete a layer. When I created broken layers, I couldn't remove them — only hide them by setting opacity to 0 (which itself was fighting expressions). The timeline gets cluttered with garbage layers.

**What I Need:**
```
Tool: deleteLayer
Parameters:
  - compIndex (int)
  - layerIndex (int)
  
Implementation: layer.remove() in ExtendScript
```

### 1.4 — Blending Modes

**Problem:** There is NO way to set a layer's blending mode (Normal, Add, Screen, Multiply, Overlay, etc.). Blending modes are absolutely fundamental to compositing. You cannot do glassmorphism, light effects, color grading overlays, or any proper compositing without them.

**What I Need:**
```
Tool: setBlendingMode
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - blendMode (enum): "normal", "add", "multiply", "screen", "overlay", "softLight", "hardLight", "difference", "colorDodge", "colorBurn", "linearDodge", "linearBurn", "dissolve", "dancingDissolve", "darken", "lighten", "classicColorDodge", "classicColorBurn", "exclusion", "hue", "saturation", "color", "luminosity"

Implementation: layer.blendingMode = BlendingMode.ADD (etc.) in ExtendScript
```

### 1.5 — Layer Parenting

**Problem:** `getLayerInfo` shows a "parent" field as null but there's no way to SET parent-child relationships. Parenting is essential for grouped animations, null object controllers, and hierarchical motion.

**What I Need:**
```
Tool: setLayerParent
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - parentLayerIndex (int | null): null to remove parenting
  
Implementation: layer.parent = comp.layer(parentIndex) or layer.parent = null
```

### 1.6 — Null Object / Adjustment Layer Creation

**Problem:** Can only create text, shape, and solid layers. Cannot create null objects (essential for controller-based animation) or adjustment layers (essential for comp-wide effects like color grading).

**What I Need:**
```
Tool: createNullObject
Parameters:
  - compIndex (int)
  - name (string)

Tool: createAdjustmentLayer  
Parameters:
  - compIndex (int)
  - name (string)
  
Implementation:
  comp.layers.addNull()
  comp.layers.addSolid([0,0,0], name, w, h, 1) then layer.adjustmentLayer = true
```

---

## PRIORITY 2: EFFECT AND PROPERTY CONTROL

### 2.1 — Read/Modify Existing Effect Parameters

**Problem:** Can only APPLY effects, cannot READ current effect values or MODIFY parameters on already-applied effects. When the Glow effect was already on a layer, I couldn't adjust its radius or threshold — I could only fail trying to add a duplicate.

**What I Need:**
```
Tool: getEffectProperties
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - effectIndex (int) OR effectName (string)
Returns: All property names, current values, and types

Tool: setEffectProperty
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - effectIndex (int) OR effectName (string)
  - propertyName (string)
  - value (any)
```

### 2.2 — Remove Effects

**Problem:** Cannot remove effects from a layer. Once an effect is applied incorrectly, it's stuck there forever through the MCP.

**What I Need:**
```
Tool: removeEffect
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - effectIndex (int) OR effectName (string)
```

### 2.3 — List Effects on a Layer

**Problem:** No way to see what effects are already applied to a layer. I kept hitting "Cannot add property" errors because Glow was already there, but I had no way to discover this beforehand.

**What I Need:**
```
Tool: getLayerEffects
Parameters:
  - compIndex (int)
  - layerIndex (int)
Returns: Array of { index, name, matchName, enabled, numProperties }
```

### 2.4 — Detailed Layer Properties

**Problem:** `getLayerInfo` returns only: index, name, enabled, locked, inPoint, outPoint. It does NOT return: position, scale, rotation, opacity, anchor point, blending mode, parent, 3D layer status, effects list, track matte, masks, source name, label color, etc.

**What I Need:** Expand `getLayerInfo` to return comprehensive properties:
```json
{
  "index": 1,
  "name": "Layer Name",
  "type": "text|shape|solid|avLayer|camera|light|null",
  "enabled": true,
  "locked": false,
  "solo": false,
  "shy": false,
  "is3D": false,
  "adjustmentLayer": false,
  "blendingMode": "normal",
  "parent": null,
  "inPoint": 0,
  "outPoint": 5,
  "startTime": 0,
  "stretch": 100,
  "position": [960, 540, 0],
  "anchorPoint": [0, 0, 0],
  "scale": [100, 100, 100],
  "rotation": 0,
  "opacity": 100,
  "label": 1,
  "trackMatteType": "none",
  "hasExpressions": { "Position": true, "Opacity": false },
  "effects": ["Gaussian Blur", "Drop Shadow"],
  "sourceName": "source_file.mov"
}
```

---

## PRIORITY 3: ANIMATION AND KEYFRAMES

### 3.1 — Read Existing Keyframes

**Problem:** Can set keyframes but cannot READ them. Cannot inspect what keyframes already exist on a property, what their values are, or what interpolation they use.

**What I Need:**
```
Tool: getKeyframes
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - propertyName (string)
Returns: Array of { time, value, inInterpolation, outInterpolation, easeIn, easeOut }
```

### 3.2 — Remove Keyframes

**Problem:** Can set keyframes but cannot remove them.

**What I Need:**
```
Tool: removeKeyframe
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - propertyName (string)
  - keyframeIndex (int) OR time (float)
```

### 3.3 — Keyframe Interpolation Control

**Problem:** `setLayerKeyframe` creates keyframes but with no control over easing. Everything is linear by default. No way to set Easy Ease, bezier curves, hold interpolation, or spatial tangents.

**What I Need:**
```
Extend setLayerKeyframe with:
  - inType (enum): "linear", "bezier", "hold"
  - outType (enum): "linear", "bezier", "hold"  
  - easeIn (object): { speed, influence } for bezier
  - easeOut (object): { speed, influence } for bezier
  - spatialTangent (object): for position keyframes
  
OR add a dedicated Tool: setKeyframeInterpolation
```

---

## PRIORITY 4: MASKS AND TRACK MATTES

### 4.1 — Create Masks

**Problem:** No mask support at all. Cannot create rectangle, ellipse, or path masks on layers. Masks are essential for revealing, hiding, and shaping layers.

**What I Need:**
```
Tool: addMask
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - maskShape (enum): "rectangle", "ellipse", "path"
  - vertices (array): for path masks [[x,y], ...]
  - position (array): center [x,y] for rect/ellipse
  - size (array): [w,h] for rect/ellipse
  - feather (float)
  - opacity (float)
  - mode (enum): "add", "subtract", "intersect", "lighten", "darken", "difference"
  - inverted (boolean)
```

### 4.2 — Track Mattes

**Problem:** Cannot set track matte relationships between layers (Alpha Matte, Luma Matte, etc.).

**What I Need:**
```
Tool: setTrackMatte
Parameters:
  - compIndex (int)
  - layerIndex (int)
  - matteType (enum): "none", "alpha", "alphaInverted", "luma", "lumaInverted"
```

---

## PRIORITY 5: PROJECT AND ASSET MANAGEMENT

### 5.1 — Import Files

**Problem:** Cannot import footage, images, or audio into the project.

**What I Need:**
```
Tool: importFile
Parameters:
  - filePath (string): absolute path to the file
  - importAs (enum): "footage", "composition", "project"
Returns: { itemId, name, type, duration, dimensions }
```

### 5.2 — Add Layer From Project Item

**Problem:** Cannot add an existing project item (footage, precomp, image) to a composition as a layer.

**What I Need:**
```
Tool: addLayerFromItem
Parameters:
  - compIndex (int)
  - itemId (int): project item ID
  - startTime (float)
  - atIndex (int): position in layer stack
```

### 5.3 — Precompose Layers

**Problem:** Cannot precompose selected layers into a new composition.

**What I Need:**
```
Tool: precomposeLayers
Parameters:
  - compIndex (int)
  - layerIndices (array of int)
  - name (string): name for new precomp
  - moveAttributes (boolean): move all attributes into new comp
```

### 5.4 — Duplicate Layer

**Problem:** Cannot duplicate an existing layer.

**What I Need:**
```
Tool: duplicateLayer
Parameters:
  - compIndex (int)
  - layerIndex (int)
Returns: { newLayerIndex, newLayerName }
```

---

## PRIORITY 6: RENDERING AND OUTPUT

### 6.1 — Render Queue

**Problem:** No rendering capability at all.

**What I Need:**
```
Tool: addToRenderQueue
Parameters:
  - compIndex (int)
  - outputPath (string)
  - format (enum): "mp4", "mov", "avi", "png_sequence", "jpg_sequence", "gif"
  - quality (enum): "best", "draft"

Tool: startRender
Parameters: (none — renders all queued items)
Returns: { status, outputPaths }
```

### 6.2 — Screenshot/Snapshot Current Frame

**Problem:** Cannot capture a screenshot of the current comp viewer state. This would be extremely useful for Claude to visually verify its own changes without requiring the user to take and upload screenshots.

**What I Need:**
```
Tool: captureFrame
Parameters:
  - compIndex (int)
  - time (float): time in seconds
  - outputPath (string)
  - format (enum): "png", "jpg"
Returns: { path, width, height }
```

---

## PRIORITY 7: QUALITY-OF-LIFE IMPROVEMENTS

### 7.1 — Batch Operations

**Problem:** Every single operation requires a separate command → poll → result cycle. Creating a glass card required 15+ round trips. This is painfully slow.

**What I Need:**
```
Tool: executeBatch
Parameters:
  - operations (array): list of operations to execute in sequence
    Each operation: { tool, parameters }
Returns: Array of results for each operation

Example:
{
  "operations": [
    { "tool": "createShapeLayer", "parameters": { "compIndex": 1, "name": "Glass", ... } },
    { "tool": "moveLayer", "parameters": { "compIndex": 1, "layerIndex": 1, "newIndex": 5 } },
    { "tool": "setBlendingMode", "parameters": { "compIndex": 1, "layerIndex": 5, "blendMode": "screen" } },
    { "tool": "applyEffect", "parameters": { ... } }
  ]
}
```

### 7.2 — Undo/Redo

**Problem:** No undo capability. When something goes wrong, there's no recovery.

**What I Need:**
```
Tool: undo
Parameters:
  - steps (int): number of undo steps (default: 1)

Tool: redo
Parameters:
  - steps (int)
  
Implementation: app.executeCommand(app.findMenuCommandId("Undo")) or use undo groups
```

### 7.3 — Undo Groups

**Problem:** Each MCP operation is a separate undo entry. A complex operation like "create glassmorphism card" creates 15 undo entries instead of one.

**What I Need:**
```
Wrap batch operations in:
  app.beginUndoGroup("Operation Name")
  // ... all operations ...
  app.endUndoGroup()
```

### 7.4 — Robust Result Polling

**Problem:** The `get-results` tool frequently returns stale data, "waiting" status, or results from a previous command. The timestamp-based staleness detection is unreliable.

**What I Need:**
- Add a unique command ID to each command
- Return the command ID in the result so the MCP can verify it's getting the right result
- Add a configurable timeout with proper error messaging
- Consider switching from file polling to a socket/HTTP-based communication for lower latency

### 7.5 — Error Handling for Effect Application

**Problem:** When I tried to apply Glow to a layer that already had Glow, I got a cryptic `"Cannot add property with name ADBE Glow"` error. The server should check if an effect already exists before trying to add it, and either skip or modify the existing one.

**What I Need:**
- Before applying an effect, check if it already exists on the layer
- If it exists, return a clear error message: "Effect 'Glow' already exists on layer 4 at effect index 2. Use setEffectProperty to modify it."
- Or add a `replaceIfExists` boolean parameter

### 7.6 — Composition Lookup by Name

**Problem:** Everything requires `compIndex` which is the 1-based position in the project panel. This is fragile — if the user reorders items, all indices break.

**What I Need:**
- Accept `compName` as an alternative to `compIndex` in ALL tools
- Resolve name → index internally

---

## PRIORITY 8: ADVANCED FEATURES (NICE TO HAVE)

### 8.1 — Text Layer Property Control
- Set/get font family, size, color, tracking, leading, justification
- Access text animator properties

### 8.2 — Shape Layer Path Control  
- Modify shape paths, add/remove vertices
- Set fill/stroke colors on existing shape layers
- Add additional shape groups to existing shape layers

### 8.3 — Camera and Light Layers
- Create camera layers with proper settings
- Create light layers (point, spot, ambient, parallel)

### 8.4 — Markers
- Add/remove/read composition and layer markers
- Set marker comments and chapter names

### 8.5 — Time Remapping
- Enable/disable time remapping on layers
- Set time remap keyframes

### 8.6 — Motion Blur and Frame Blending
- Toggle motion blur per layer and at comp level
- Set frame blending modes

---

## IMPLEMENTATION NOTES

### Architecture Recommendations

1. **Command ID System**: Every command should have a UUID. Results should echo this UUID so the polling system can match results to commands. This eliminates the stale result problem entirely.

2. **Undo Group Wrapping**: ALL operations should be wrapped in `app.beginUndoGroup()` / `app.endUndoGroup()` so each MCP tool call is one undo step.

3. **Error Recovery**: If an ExtendScript operation fails mid-execution, catch the error, end any open undo groups, and return a structured error with actionable information.

4. **Dual Lookup**: Every tool that accepts `compIndex` should also accept `compName`. Every tool that accepts `layerIndex` should also accept `layerName`. Resolve internally.

5. **Validation Layer**: Validate parameters BEFORE sending to After Effects. Check that indices are in range, enum values are valid, required parameters exist. Return clear validation errors.

6. **Effect Registry**: Maintain a mapping of common effect names to matchNames so the AI doesn't need to guess:
   ```
   "Gaussian Blur" → "ADBE Gaussian Blur 2"
   "Fast Box Blur" → "ADBE Box Blur2"
   "Glow" → "ADBE Glow"
   "Drop Shadow" → "ADBE Drop Shadow"
   "Fill" → "ADBE Fill"
   "Stroke" → "ADBE Stroke"
   "CC Particle World" → "CC Particle World"
   // ... etc for all commonly used effects
   ```

7. **Batch Execution**: The batch tool should execute all operations in a single ExtendScript evaluation to avoid the file I/O overhead of individual commands. Wrap the batch in a single undo group.

### File Structure

The codebase likely has:
```
src/
  server.ts (or .js) — MCP server definition
  tools/ — tool handlers
  scripts/ — ExtendScript files that run in AE
  bridge/ — CEP/UXP panel code
```

Please audit all files, understand the current architecture, then implement the changes. Start with Priority 1 (layer reorder, delete, enable/disable, blending modes) since those unblock the most workflows, then work through the priorities in order.

### Testing

After implementing each tool, test it by:
1. Verifying the ExtendScript executes without errors in AE
2. Confirming the result is properly returned through the bridge
3. Testing edge cases (invalid indices, missing layers, duplicate effects)

---

## SUMMARY OF ALL NEW TOOLS NEEDED

| Priority | Tool | Purpose |
|----------|------|---------|
| P1 | `moveLayer` | Reorder layers in timeline |
| P1 | `setLayerVisibility` | Toggle layer on/off |
| P1 | `deleteLayer` | Remove layer from comp |
| P1 | `setBlendingMode` | Set layer blend mode |
| P1 | `setLayerParent` | Set parent-child relationship |
| P1 | `createNullObject` | Create null object layer |
| P1 | `createAdjustmentLayer` | Create adjustment layer |
| P2 | `getEffectProperties` | Read effect parameter values |
| P2 | `setEffectProperty` | Modify existing effect parameter |
| P2 | `removeEffect` | Delete effect from layer |
| P2 | `getLayerEffects` | List all effects on layer |
| P2 | Enhanced `getLayerInfo` | Return all layer properties |
| P3 | `getKeyframes` | Read existing keyframes |
| P3 | `removeKeyframe` | Delete a keyframe |
| P3 | Enhanced `setLayerKeyframe` | Easing/interpolation control |
| P4 | `addMask` | Create layer masks |
| P4 | `setTrackMatte` | Set track matte type |
| P5 | `importFile` | Import footage/images |
| P5 | `addLayerFromItem` | Add project item as layer |
| P5 | `precomposeLayers` | Precompose layer selection |
| P5 | `duplicateLayer` | Duplicate a layer |
| P6 | `addToRenderQueue` | Queue for render |
| P6 | `startRender` | Start rendering |
| P6 | `captureFrame` | Screenshot current frame |
| P7 | `executeBatch` | Run multiple operations at once |
| P7 | `undo` / `redo` | Undo/redo operations |

**Total: 27 new tools + 3 enhanced existing tools**

Please start by auditing the current codebase, understanding the bridge communication pattern, then implement Priority 1 tools first. Let me know if you need me to share any specific files from the project.
