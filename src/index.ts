import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import * as path from "path";
import { z } from "zod";
import { fileURLToPath } from 'url';
import { createBridgeHealthResponse } from "./bridge/health.js";
import { normalizeBridgePayload, createBridgeTimeoutResponse } from "./bridge/normalize.js";
import { PropertyTargetSchema, PropertyValueSchema } from "./bridge/property-schemas.js";
import { toBridgePropertyPath } from "./contracts/property-path.js";

// Create an MCP server
const server = new McpServer({
  name: "AfterEffectsServer",
  version: "2.0.0"
});

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const SCRIPTS_DIR = path.join(__dirname, "scripts");
const TEMP_DIR = path.join(__dirname, "temp");

// ─────────────────────────────────────────────────────────────
// INFRASTRUCTURE HELPERS
// ─────────────────────────────────────────────────────────────

/** Get the correct directory for AE bridge files */
function getAETempDir(): string {
  const homeDir = os.homedir();
  const bridgeDir = path.join(homeDir, 'Documents', 'ae-mcp-bridge');
  if (!fs.existsSync(bridgeDir)) {
    fs.mkdirSync(bridgeDir, { recursive: true });
  }
  return bridgeDir;
}

/** Generate a unique command ID */
function generateCommandId(): string {
  return crypto.randomUUID();
}

/** Read results from After Effects temp file */
function readResultsFromTempFile(): string {
  try {
    const tempFilePath = path.join(getAETempDir(), 'ae_mcp_result.json');
    if (fs.existsSync(tempFilePath)) {
      const stats = fs.statSync(tempFilePath);
      const content = fs.readFileSync(tempFilePath, 'utf8');
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      if (stats.mtime < thirtySecondsAgo) {
        return JSON.stringify({
          warning: "Result file appears to be stale (not recently updated).",
          message: "After Effects may not be updating results or the MCP Bridge Auto panel isn't running.",
          lastModified: stats.mtime.toISOString(),
          originalContent: content
        });
      }
      return content;
    } else {
      return JSON.stringify({ error: "No results file found. Please run a script in After Effects first." });
    }
  } catch (error) {
    return JSON.stringify({ error: `Failed to read results: ${String(error)}` });
  }
}

/** Wait for a fresh result matching a specific command ID */
async function waitForBridgeResult(commandId?: string, expectedCommand?: string, timeoutMs: number = 30000, pollMs: number = 100): Promise<string> {
  const start = Date.now();
  const resultPath = path.join(getAETempDir(), 'ae_mcp_result.json');

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(resultPath)) {
      try {
        const content = fs.readFileSync(resultPath, 'utf8');
        if (content && content.length > 0) {
          try {
            const parsed = JSON.parse(content);
            // Match by command ID (preferred) or command name (fallback)
            if (commandId && parsed._commandId === commandId) {
              return content;
            }
            if (!commandId && expectedCommand && parsed._commandExecuted === expectedCommand) {
              return content;
            }
          } catch {
            // not JSON yet; continue polling
          }
        }
      } catch {
        // transient read error; continue polling
      }
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  return JSON.stringify({ error: `Timed out waiting for bridge result${commandId ? ` (commandId: ${commandId})` : ''}${expectedCommand ? ` for command '${expectedCommand}'` : ''}.` });
}

/** Write command to file with UUID tracking */
function writeCommandFile(command: string, args: Record<string, any> = {}, commandId?: string): string {
  const id = commandId || generateCommandId();
  try {
    const commandFile = path.join(getAETempDir(), 'ae_command.json');
    const commandData = {
      command,
      args,
      commandId: id,
      timestamp: new Date().toISOString(),
      status: "pending"
    };
    fs.writeFileSync(commandFile, JSON.stringify(commandData, null, 2));
    console.error(`Command "${command}" (id: ${id}) written to ${commandFile}`);
  } catch (error) {
    console.error("Error writing command file:", error);
  }
  return id;
}

/** Clear the results file to avoid stale cache */
function clearResultsFile(): void {
  try {
    const resultFile = path.join(getAETempDir(), 'ae_mcp_result.json');
    const resetData = {
      status: "waiting",
      message: "Waiting for new result from After Effects...",
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(resultFile, JSON.stringify(resetData, null, 2));
  } catch (error) {
    console.error("Error clearing results file:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// SHARED ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────

const CompIdentifierSchema = {
  compIndex: z.number().int().positive().optional().describe("1-based index of the composition in the project panel. Provide this OR compName."),
  compName: z.string().optional().describe("Name of the composition. Provide this OR compIndex.")
};

const LayerIdentifierSchema = {
  ...CompIdentifierSchema,
  layerIndex: z.number().int().positive().optional().describe("1-based index of the layer. Provide this OR layerName."),
  layerName: z.string().optional().describe("Name of the layer. Provide this OR layerIndex.")
};

const ItemIdentifierSchema = {
  itemId: z.number().int().positive().optional().describe("Project item ID."),
  itemIndex: z.number().int().positive().optional().describe("1-based project item index."),
  itemName: z.string().optional().describe("Project item name.")
};

// Blending modes enum
const BLEND_MODES = [
  "normal", "dissolve", "dancingDissolve",
  "darken", "multiply", "colorBurn", "linearBurn", "darkerColor",
  "lighten", "screen", "colorDodge", "linearDodge", "lighterColor",
  "overlay", "softLight", "hardLight", "vividLight", "linearLight", "pinLight", "hardMix",
  "difference", "exclusion", "subtract", "divide",
  "hue", "saturation", "color", "luminosity",
  "add", "luminoscentPremul", "silhouetteAlpha", "silhouetteLuma",
  "stencilAlpha", "stencilLuma", "alphaAdd"
] as const;

const BlendModeSchema = z.enum(BLEND_MODES).describe("Blending mode for the layer.");

// Effect name → matchName registry
const EFFECT_REGISTRY: Record<string, string> = {
  "Gaussian Blur": "ADBE Gaussian Blur 2",
  "Camera Lens Blur": "ADBE Camera Lens Blur",
  "Directional Blur": "ADBE Directional Blur",
  "Fast Box Blur": "ADBE Box Blur2",
  "Radial Blur": "ADBE Radial Blur",
  "Smart Blur": "ADBE Smart Blur",
  "Unsharp Mask": "ADBE Unsharp Mask",
  "Brightness & Contrast": "ADBE Brightness & Contrast 2",
  "Color Balance": "ADBE Color Balance (HLS)",
  "Curves": "ADBE CurvesCustom",
  "Exposure": "ADBE Exposure2",
  "Hue/Saturation": "ADBE HUE SATURATION",
  "Levels": "ADBE Pro Levels2",
  "Vibrance": "ADBE Vibrance",
  "Glow": "ADBE Glow",
  "Drop Shadow": "ADBE Drop Shadow",
  "Bevel Alpha": "ADBE Bevel Alpha",
  "Noise": "ADBE Noise",
  "Fractal Noise": "ADBE Fractal Noise",
  "Fill": "ADBE Fill",
  "Stroke": "ADBE Stroke",
  "Tint": "ADBE Tint",
  "Tritone": "ADBE Tritone",
  "CC Particle World": "CC Particle World",
  "CC Light Sweep": "CC Light Sweep",
  "Turbulent Displace": "ADBE Turbulent Displace",
  "Wave Warp": "ADBE Wave Warp",
  "Ramp": "ADBE Ramp",
  "4-Color Gradient": "ADBE 4ColorGradient",
  "Checkerboard": "ADBE Checkerboard",
  "Circle": "ADBE Circle",
  "Ellipse": "ADBE Ellipse"
};

// ─────────────────────────────────────────────────────────────
// HELPER: queue-and-wait pattern for tools
// ─────────────────────────────────────────────────────────────

/** Standard queue + wait wrapper used by most tools */
async function queueAndWait(command: string, args: Record<string, any>, description: string, timeoutMs = 30000) {
  try {
    clearResultsFile();
    const commandId = writeCommandFile(command, args);
    const result = await waitForBridgeResult(commandId, command, timeoutMs);
    const normalized = result.includes('Timed out waiting for bridge result')
      ? createBridgeTimeoutResponse(command, commandId)
      : normalizeBridgePayload(result, command, commandId);

    // Summarize oversized responses to prevent MCP client truncation
    const MAX_RESPONSE_CHARS = 15000;
    const normalizedText = JSON.stringify(normalized, null, 2);
    if (normalizedText.length > MAX_RESPONSE_CHARS) {
      try {
        const parsed = JSON.parse(normalizedText);
        const payload = parsed.data ?? parsed;
        if (payload.layers && Array.isArray(payload.layers)) {
          const total = payload.layers.length;
          payload.layers = payload.layers.slice(0, 20);
          parsed._truncated = true;
          parsed._truncatedNote = `Showing 20 of ${total} layers. Use filterType or layerIndices to narrow results.`;
          return { content: [{ type: "text" as const, text: JSON.stringify(parsed, null, 2) }] };
        }
        if (payload.keyframes && Array.isArray(payload.keyframes)) {
          const total = payload.keyframes.length;
          payload.keyframes = payload.keyframes.slice(0, 50);
          parsed._truncated = true;
          parsed._truncatedNote = `Showing 50 of ${total} keyframes.`;
          return { content: [{ type: "text" as const, text: JSON.stringify(parsed, null, 2) }] };
        }
      } catch { /* not JSON, return as-is */ }
    }

    return {
      content: [{ type: "text" as const, text: normalizedText }],
      isError: normalized.status === "error"
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Error executing ${description}: ${String(error)}` }],
      isError: true
    };
  }
}

function getToolResultText(result: any): string {
  if (!result || !result.content || !result.content[0]) {
    return "";
  }
  return String(result.content[0].text || "");
}

function isBridgeErrorPayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed?.status === "error" || Boolean(parsed?.error);
  } catch {
    return false;
  }
}

function listUnknownKeys(params: Record<string, any>, allowedKeys: string[]): string[] {
  const allowed = new Set(allowedKeys);
  return Object.keys(params).filter((key) => !allowed.has(key));
}

function withNormalizedPropertyPath<T extends Record<string, any>>(params: T): T {
  if (params.propertyPath) {
    return { ...params, propertyPath: toBridgePropertyPath(params.propertyPath) };
  }
  if (params.propertyPathString) {
    return { ...params, propertyPath: toBridgePropertyPath(params.propertyPathString) };
  }
  return params;
}

const RUN_SCRIPT_PARAMETER_ALLOWLIST: Record<string, string[]> = {
  createComposition: ["name", "width", "height", "pixelAspect", "duration", "frameRate", "backgroundColor"],
  createTextLayer: ["compName", "text", "position", "fontSize", "color", "startTime", "duration", "fontFamily", "alignment"],
  createShapeLayer: ["compName", "shapeType", "position", "size", "fillColor", "strokeColor", "strokeWidth", "startTime", "duration", "name", "points"],
  createSolidLayer: ["compName", "name", "color", "width", "height", "pixelAspect", "duration", "startTime"],
  setLayerKeyframe: ["compIndex", "compName", "layerIndex", "layerName", "propertyName", "timeInSeconds", "value", "inType", "outType", "easeIn", "easeOut"],
  setLayerExpression: ["compIndex", "compName", "layerIndex", "layerName", "propertyName", "expressionString"],
  applyEffect: ["compIndex", "compName", "layerIndex", "layerName", "effectName", "effectMatchName", "effectCategory", "presetPath", "effectSettings", "autoAdjustmentLayer"],
  inspectPropertyTree: ["compIndex", "compName", "layerIndex", "layerName", "propertyPath", "propertyPathString", "propertyName", "maxDepth", "includeValues"],
  listProjectItems: ["typeFilter", "folderOnly", "includeFootageInfo"],
  getProjectItemInfo: ["itemId", "itemIndex", "itemName"],
  getCompositionSettings: ["compIndex", "compName"],
  getPropertyMetadata: ["compIndex", "compName", "layerIndex", "layerName", "propertyPath", "propertyPathString", "propertyName"],
  getPropertyValue: ["compIndex", "compName", "layerIndex", "layerName", "propertyPath", "propertyPathString", "propertyName", "time", "preExpression"],
  setPropertyValue: ["compIndex", "compName", "layerIndex", "layerName", "propertyPath", "propertyPathString", "propertyName", "value", "time"],
  getExpression: ["compIndex", "compName", "layerIndex", "layerName", "propertyPath", "propertyPathString", "propertyName"],
  searchTextLayers: ["compIndex", "compName", "searchText", "caseSensitive"],
  executeBatch: ["operations"]
};

const BATCH_TOOL_ALIASES: Record<string, string> = {
  "create-composition": "createComposition",
  "create-text-layer": "createTextLayer",
  "create-shape-layer": "createShapeLayer",
  "create-solid-layer": "createSolidLayer",
  "set-layer-properties": "setLayerProperties",
  "set-layer-keyframe": "setLayerKeyframe",
  "set-layer-expression": "setLayerExpression",
  "apply-effect": "applyEffect",
  "apply-effect-template": "applyEffectTemplate",
  "move-layer": "moveLayer",
  "rename-layer": "renameLayer",
  "set-layer-visibility": "setLayerVisibility",
  "delete-layer": "deleteLayer",
  "set-blending-mode": "setBlendingMode",
  "set-layer-parent": "setLayerParent",
  "create-null-object": "createNullObject",
  "create-adjustment-layer": "createAdjustmentLayer",
  "get-layer-effects": "getLayerEffects",
  "get-effect-properties": "getEffectProperties",
  "set-effect-property": "setEffectProperty",
  "remove-effect": "removeEffect",
  "get-keyframes": "getKeyframes",
  "remove-keyframe": "removeKeyframe",
  "add-mask": "addMask",
  "set-track-matte": "setTrackMatte",
  "duplicate-layer": "duplicateLayer",
  "import-file": "importFile",
  "add-layer-from-item": "addLayerFromItem",
  "precompose-layers": "precomposeLayers",
  "set-text-properties": "setTextProperties",
  "get-text-properties": "getTextProperties",
  "modify-shape-path": "modifyShapePath",
  "set-shape-colors": "setShapeColors",
  "add-shape-group": "addShapeGroup",
  "create-camera": "createCamera",
  "create-light": "createLight",
  "add-marker": "addMarker",
  "get-markers": "getMarkers",
  "remove-marker": "removeMarker",
  "set-time-remapping": "setTimeRemapping",
  "set-motion-blur": "setMotionBlur",
  "set-frame-blending": "setFrameBlending",
  "add-to-render-queue": "addToRenderQueue",
  "start-render": "startRender",
  "capture-frame": "captureFrame",
  "search-text-layers": "searchTextLayers",
  "inspect-property-tree": "inspectPropertyTree",
  "list-project-items": "listProjectItems",
  "get-project-item-info": "getProjectItemInfo",
  "get-composition-settings": "getCompositionSettings",
  "get-property-metadata": "getPropertyMetadata",
  "get-property-value": "getPropertyValue",
  "set-property-value": "setPropertyValue",
  "get-expression": "getExpression"
};

function normalizeBatchOperations(operations: Array<{ tool: string; parameters: Record<string, any> }>) {
  return operations.map((operation) => {
    const normalizedTool = BATCH_TOOL_ALIASES[operation.tool] || operation.tool;
    return {
      tool: normalizedTool,
      parameters: operation.parameters || {}
    };
  });
}

function extFromUrlPath(pathname: string): string {
  const ext = path.extname(pathname).toLowerCase();
  if (ext) return ext;
  return ".bin";
}

async function downloadToTempFile(urlString: string): Promise<string> {
  const url = new URL(urlString);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }

  const client = url.protocol === "https:" ? https : http;
  const filename = `ae-mcp-${Date.now()}-${crypto.randomUUID()}${extFromUrlPath(url.pathname)}`;
  const destination = path.join(TEMP_DIR, filename);

  await fs.promises.mkdir(TEMP_DIR, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const request = client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const redirectUrl = new URL(response.headers.location, url).toString();
        downloadToTempFile(redirectUrl).then((redirectedPath) => {
          fs.copyFileSync(redirectedPath, destination);
          resolve();
        }).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", (error) => reject(error));
    });

    request.on("error", (error) => reject(error));
    request.setTimeout(30000, () => {
      request.destroy(new Error("Download timed out after 30s"));
    });
  });

  return destination;
}

// ─────────────────────────────────────────────────────────────
// RESOURCE: Compositions
// ─────────────────────────────────────────────────────────────

server.resource(
  "compositions",
  "aftereffects://compositions",
  async (uri) => {
    clearResultsFile();
    const commandId = writeCommandFile("listCompositions", {});
    const result = await waitForBridgeResult(commandId, "listCompositions", 6000);
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: result }]
    };
  }
);

// TOOL: run-script (generic)
// ─────────────────────────────────────────────────────────────

server.tool(
  "run-script",
  "Run a predefined script in After Effects. For most operations, prefer using the dedicated tools (moveLayer, deleteLayer, etc.).",
  {
    script: z.string().describe("Name of the predefined script to run"),
    parameters: z.record(z.any()).optional().describe("Optional parameters for the script")
  },
  async ({ script, parameters = {} }) => {
    const allowedScripts = [
      "listCompositions", "getProjectInfo", "getLayerInfo", "bridgeHealth",
      "createComposition", "createTextLayer", "createShapeLayer", "createSolidLayer",
      "setLayerProperties", "setLayerKeyframe", "setLayerExpression",
      "applyEffect", "applyEffectTemplate", "bridgeTestEffects",
      // P1
      "moveLayer", "renameLayer", "setLayerVisibility", "deleteLayer",
      "setBlendingMode", "setLayerParent", "createNullObject", "createAdjustmentLayer",
      // P2-P3
      "getLayerEffects", "getEffectProperties", "setEffectProperty", "removeEffect",
      "getLayerInfoEnhanced", "getKeyframes", "removeKeyframe",
      // P4-P5
      "addMask", "setTrackMatte", "importFile", "addLayerFromItem",
      "precomposeLayers", "duplicateLayer",
      // P6-P7
      "addToRenderQueue", "startRender", "captureFrame",
      "executeBatch", "undo", "redo",
      // P8
      "setTextProperties", "getTextProperties",
      "modifyShapePath", "setShapeColors", "addShapeGroup",
      "createCamera", "createLight",
      "addMarker", "getMarkers", "removeMarker",
      "setTimeRemapping", "setMotionBlur", "setFrameBlending",
      "getActiveComp", "saveProject", "openProject",
      "searchTextLayers",
      "inspectPropertyTree", "listProjectItems", "getProjectItemInfo",
      "getCompositionSettings", "getPropertyMetadata", "getPropertyValue",
      "setPropertyValue", "getExpression"
    ];

    if (!allowedScripts.includes(script)) {
      return {
        content: [{ type: "text", text: `Error: Script "${script}" is not allowed. Allowed scripts are: ${allowedScripts.join(", ")}` }],
        isError: true
      };
    }

    const allowedKeys = RUN_SCRIPT_PARAMETER_ALLOWLIST[script];
    if (allowedKeys) {
      const unknownKeys = listUnknownKeys(parameters, allowedKeys);
      if (unknownKeys.length > 0) {
        return {
          content: [{
            type: "text",
            text: `Error: Unknown parameter(s) for run-script(${script}): ${unknownKeys.join(", ")}. Allowed parameters: ${allowedKeys.join(", ")}`
          }],
          isError: true
        };
      }
    }

    return queueAndWait(script, parameters, `run-script(${script})`);
  }
);

// ─────────────────────────────────────────────────────────────
// TOOL: get-results
// ─────────────────────────────────────────────────────────────

server.tool(
  "get-results",
  "Get results from the last script executed in After Effects",
  {},
  async () => {
    try {
      const result = readResultsFromTempFile();
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error getting results: ${String(error)}` }],
        isError: true
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────
// TOOL: get-help
// ─────────────────────────────────────────────────────────────

server.tool(
  "bridge-health",
  "Report file bridge status, last result timestamp, and result preview.",
  {},
  async () => {
    const bridgeDir = getAETempDir();
    const commandPath = path.join(bridgeDir, "ae_command.json");
    const resultPath = path.join(bridgeDir, "ae_mcp_result.json");
    let resultPreview: unknown = null;
    let resultFileMtime: string | undefined;

    if (fs.existsSync(resultPath)) {
      const stats = fs.statSync(resultPath);
      resultFileMtime = stats.mtime.toISOString();
      try {
        resultPreview = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      } catch {
        resultPreview = fs.readFileSync(resultPath, "utf8");
      }
    }

    const payload = createBridgeHealthResponse({
      bridgeDir,
      commandFileExists: fs.existsSync(commandPath),
      resultFileExists: fs.existsSync(resultPath),
      resultFileMtime,
      resultPreview,
    });

    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
);

server.tool(
  "get-help",
  "Get help on using the After Effects MCP integration",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: `# After Effects MCP Integration Help (v2.0)

## Setup
1. Run \`npm run build\` then \`npm run install-bridge\`
2. Open After Effects → Window → mcp-bridge-auto.jsx
3. Enable "Allow Scripts to Write Files and Access Network" in AE preferences

## Available Tools

### Layer Management (P1)
- **move-layer** — Reorder layers in the timeline
- **rename-layer** — Rename a layer
- **set-layer-visibility** — Toggle layer on/off
- **delete-layer** — Remove a layer
- **set-blending-mode** — Set layer blend mode
- **set-layer-parent** — Set parent-child relationship
- **create-null-object** — Create null object layer
- **create-adjustment-layer** — Create adjustment layer

### Creation
- **create-composition** — Create a new composition
- **run-script** with createTextLayer/createShapeLayer/createSolidLayer (legacy compatibility)

### Effects
- **apply-effect** — Apply an effect by matchName or display name
- **apply-effect-template** — Apply predefined effect templates
- **get-effects-help** — List common effect matchNames

### Animation
- **set-layer-keyframe** — Set a keyframe with optional easing
- **set-layer-expression** — Set or remove expressions

### Rendering / Assets
- **add-to-render-queue** / **start-render**
- **render-composition** — One-shot render helper
- **import-file** / **import-from-url**

### Project
- **get-active-comp** — Resolve active composition quickly
- **save-project** / **open-project**
- **bridge-health** — Inspect bridge file status and last result

### Introspection (new contract-first tools)
- **inspect-property-tree** — Traverse nested property groups with canonical paths
- **get-property-metadata** — Read property capabilities, dimensions, and keyframe metadata
- **get-property-value** / **set-property-value** — Directly read/write property values using property paths
- **get-expression** — Read current property expressions
- **list-project-items** / **get-project-item-info** — Inspect project panel items
- **get-composition-settings** — Inspect composition-level settings

### First-slice behavior notes
- \`set-property-value\` uses \`setValueAtTime()\` automatically when the target property already has keyframes or when a \`time\` argument is provided.
- After updating \`mcp-bridge-auto.jsx\`, reinstall/reopen the AE ScriptUI panel so live AE behavior matches the latest bridge code.

### Text & Search
- **search-text-layers** — Search all text layers for matching content
- **get-text-properties** — Read text properties (supports batch via layerIndices)

### Naming Convention
- Public style is **kebab-case**.
- camelCase tool names remain available for backward compatibility.

### All tools support dual lookup:
- Use \`compIndex\` OR \`compName\` to identify compositions
- Use \`layerIndex\` OR \`layerName\` to identify layers

## Changes in v2.0
- Command ID system for reliable result matching
- All operations wrapped in undo groups
- Dual name/index lookup on all tools
- 7 new P1 layer management tools
- Longer default bridge timeouts for slow AE operations
- Layer info filtering by type and indices
- Text content included in layer info responses
- search-text-layers tool for content search across text layers
- Batch getTextProperties via layerIndices parameter
- Response summarization for large outputs
- Reduced polling latency (600ms vs 2.25s)`
      }]
    };
  }
);

// ─────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────

server.prompt(
  "list-compositions",
  "List compositions in the current After Effects project",
  () => ({
    messages: [{
      role: "user",
      content: { type: "text", text: "Please list all compositions in the current After Effects project." }
    }]
  })
);

server.prompt(
  "analyze-composition",
  { compositionName: z.string().describe("Name of the composition to analyze") },
  (args) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the composition named "${args.compositionName}" in the current After Effects project. Provide details about its duration, frame rate, resolution, and layers.`
      }
    }]
  })
);

server.prompt(
  "create-composition",
  "Create a new composition with specified settings",
  () => ({
    messages: [{
      role: "user",
      content: { type: "text", text: "Please create a new composition with custom settings. You can specify parameters like name, width, height, frame rate, etc." }
    }]
  })
);

// ─────────────────────────────────────────────────────────────
// TOOL: create-composition
// ─────────────────────────────────────────────────────────────

server.tool(
  "create-composition",
  "Create a new composition in After Effects with specified parameters",
  {
    name: z.string().describe("Name of the composition"),
    width: z.number().int().positive().describe("Width in pixels"),
    height: z.number().int().positive().describe("Height in pixels"),
    pixelAspect: z.number().positive().optional().describe("Pixel aspect ratio (default: 1.0)"),
    duration: z.number().positive().optional().describe("Duration in seconds (default: 10.0)"),
    frameRate: z.number().positive().optional().describe("Frame rate (default: 30.0)"),
    backgroundColor: z.object({
      r: z.number().int().min(0).max(255),
      g: z.number().int().min(0).max(255),
      b: z.number().int().min(0).max(255)
    }).optional().describe("Background color (RGB 0-255)")
  },
  async (params) => queueAndWait("createComposition", params, `create composition "${params.name}"`)
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 1 TOOLS — Critical Layer Operations
// ─────────────────────────────────────────────────────────────

// TOOL: moveLayer
server.tool(
  "move-layer",
  "Reorder a layer in the composition timeline. Moves layer to a new index position.",
  {
    ...LayerIdentifierSchema,
    newIndex: z.number().int().positive().describe("Desired 1-based position in the layer stack.")
  },
  async (params) => queueAndWait("moveLayer", params, `move layer to index ${params.newIndex}`)
);

server.tool(
  "moveLayer",
  "Compatibility alias for move-layer.",
  {
    ...LayerIdentifierSchema,
    newIndex: z.number().int().positive().describe("Desired 1-based position in the layer stack.")
  },
  async (params) => queueAndWait("moveLayer", params, `move layer to index ${params.newIndex}`)
);

// TOOL: renameLayer
server.tool(
  "rename-layer",
  "Rename a layer in the composition timeline.",
  {
    ...LayerIdentifierSchema,
    newName: z.string().min(1).describe("New name for the layer.")
  },
  async (params) => queueAndWait("renameLayer", params, `rename layer to ${params.newName}`)
);

server.tool(
  "renameLayer",
  "Compatibility alias for rename-layer.",
  {
    ...LayerIdentifierSchema,
    newName: z.string().min(1).describe("New name for the layer.")
  },
  async (params) => queueAndWait("renameLayer", params, `rename layer to ${params.newName}`)
);

// TOOL: setLayerVisibility
server.tool(
  "set-layer-visibility",
  "Toggle layer visibility (enabled/disabled) in the composition.",
  {
    ...LayerIdentifierSchema,
    enabled: z.boolean().describe("Whether the layer should be visible (true) or hidden (false).")
  },
  async (params) => queueAndWait("setLayerVisibility", params, `set layer visibility to ${params.enabled}`)
);

server.tool(
  "setLayerVisibility",
  "Compatibility alias for set-layer-visibility.",
  {
    ...LayerIdentifierSchema,
    enabled: z.boolean().describe("Whether the layer should be visible (true) or hidden (false).")
  },
  async (params) => queueAndWait("setLayerVisibility", params, `set layer visibility to ${params.enabled}`)
);

// TOOL: deleteLayer
server.tool(
  "delete-layer",
  "Delete (remove) a layer from the composition.",
  {
    ...LayerIdentifierSchema
  },
  async (params) => queueAndWait("deleteLayer", params, `delete layer`)
);

server.tool(
  "deleteLayer",
  "Compatibility alias for delete-layer.",
  {
    ...LayerIdentifierSchema
  },
  async (params) => queueAndWait("deleteLayer", params, "delete layer")
);

// TOOL: setBlendingMode
server.tool(
  "set-blending-mode",
  "Set the blending mode of a layer (Normal, Add, Multiply, Screen, Overlay, etc.).",
  {
    ...LayerIdentifierSchema,
    blendMode: BlendModeSchema
  },
  async (params) => queueAndWait("setBlendingMode", params, `set blending mode to ${params.blendMode}`)
);

server.tool(
  "setBlendingMode",
  "Compatibility alias for set-blending-mode.",
  {
    ...LayerIdentifierSchema,
    blendMode: BlendModeSchema
  },
  async (params) => queueAndWait("setBlendingMode", params, `set blend mode to ${params.blendMode}`)
);

// TOOL: setLayerParent
server.tool(
  "set-layer-parent",
  "Set or remove parent-child relationship between layers. Parent layer controls child transforms.",
  {
    ...LayerIdentifierSchema,
    parentLayerIndex: z.number().int().positive().nullable().describe("1-based index of the parent layer (null to remove parenting)."),
    parentLayerName: z.string().optional().describe("Name of the parent layer (alternative to parentLayerIndex).")
  },
  async (params) => queueAndWait("setLayerParent", params, `set layer parent`)
);

server.tool(
  "setLayerParent",
  "Compatibility alias for set-layer-parent.",
  {
    ...LayerIdentifierSchema,
    parentLayerIndex: z.number().int().positive().nullable().describe("1-based index of the parent layer (null to remove parenting)."),
    parentLayerName: z.string().optional().describe("Name of the parent layer (alternative to parentLayerIndex).")
  },
  async (params) => queueAndWait("setLayerParent", params, "set layer parent")
);

// TOOL: createNullObject
server.tool(
  "create-null-object",
  "Create a null object layer in the composition. Null objects are invisible layers used as controllers for parented animations.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the null object (default: auto-generated).")
  },
  async (params) => queueAndWait("createNullObject", params, `create null object "${params.name || 'Null'}"`)
);

server.tool(
  "createNullObject",
  "Compatibility alias for create-null-object.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the null object (default: auto-generated).")
  },
  async (params) => queueAndWait("createNullObject", params, `create null object "${params.name || 'Null'}"`)
);

// TOOL: createAdjustmentLayer
server.tool(
  "create-adjustment-layer",
  "Create an adjustment layer in the composition. Effects on adjustment layers apply to all layers below.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the adjustment layer (default: 'Adjustment Layer').")
  },
  async (params) => queueAndWait("createAdjustmentLayer", params, `create adjustment layer "${params.name || 'Adjustment Layer'}"`)
);

server.tool(
  "createAdjustmentLayer",
  "Compatibility alias for create-adjustment-layer.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the adjustment layer (default: 'Adjustment Layer').")
  },
  async (params) => queueAndWait("createAdjustmentLayer", params, `create adjustment layer "${params.name || 'Adjustment Layer'}"`)
);

// ─────────────────────────────────────────────────────────────
// EXISTING TOOLS — Keyframes, Expressions, Effects
// ─────────────────────────────────────────────────────────────

// TOOL: setLayerKeyframe
server.tool(
  "set-layer-keyframe",
  "Set a keyframe for a specific layer property at a given time.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property to keyframe (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    timeInSeconds: z.number().describe("The time (in seconds) for the keyframe."),
    value: z.any().optional().describe("The value for the keyframe (e.g., [x,y] for Position, percentage for Opacity)."),
    inType: z.enum(["linear", "bezier", "hold"]).optional().describe("Incoming interpolation type."),
    outType: z.enum(["linear", "bezier", "hold"]).optional().describe("Outgoing interpolation type."),
    easeIn: z.object({ speed: z.number(), influence: z.union([z.number(), z.array(z.number())]) }).optional().describe("Ease-in parameters for bezier interpolation."),
    easeOut: z.object({ speed: z.number(), influence: z.union([z.number(), z.array(z.number())]) }).optional().describe("Ease-out parameters for bezier interpolation.")
  },
  async (params) => queueAndWait("setLayerKeyframe", params, `set keyframe on ${params.propertyName}`)
);

server.tool(
  "setLayerKeyframe",
  "Compatibility alias for set-layer-keyframe.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property to keyframe (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    timeInSeconds: z.number().describe("The time (in seconds) for the keyframe."),
    value: z.any().optional().describe("The value for the keyframe (e.g., [x,y] for Position, percentage for Opacity)."),
    inType: z.enum(["linear", "bezier", "hold"]).optional().describe("Incoming interpolation type."),
    outType: z.enum(["linear", "bezier", "hold"]).optional().describe("Outgoing interpolation type."),
    easeIn: z.object({ speed: z.number(), influence: z.union([z.number(), z.array(z.number())]) }).optional().describe("Ease-in parameters for bezier interpolation."),
    easeOut: z.object({ speed: z.number(), influence: z.union([z.number(), z.array(z.number())]) }).optional().describe("Ease-out parameters for bezier interpolation.")
  },
  async (params) => queueAndWait("setLayerKeyframe", params, `set keyframe on ${params.propertyName}`)
);

// TOOL: setLayerExpression
server.tool(
  "set-layer-expression",
  "Set or remove an expression for a specific layer property.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    expressionString: z.string().describe("The expression string. Empty string removes the expression.")
  },
  async (params) => queueAndWait("setLayerExpression", params, `set expression on ${params.propertyName}`)
);

server.tool(
  "setLayerExpression",
  "Compatibility alias for set-layer-expression.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    expressionString: z.string().describe("The expression string. Empty string removes the expression.")
  },
  async (params) => queueAndWait("setLayerExpression", params, `set expression on ${params.propertyName}`)
);

// TOOL: apply-effect
server.tool(
  "apply-effect",
  "Apply an effect to a layer in After Effects.",
  {
    ...LayerIdentifierSchema,
    effectName: z.string().optional().describe("Display name of the effect (e.g., 'Gaussian Blur'). Will be resolved to matchName via internal registry."),
    effectMatchName: z.string().optional().describe("After Effects internal matchName (e.g., 'ADBE Gaussian Blur 2'). More reliable than display name."),
    effectCategory: z.string().optional().describe("Optional category for filtering."),
    presetPath: z.string().optional().describe("Optional path to an effect preset (.ffx) file."),
    effectSettings: z.record(z.any()).optional().describe("Optional initial settings for the effect (e.g., { 'Blurriness': 25 })."),
    autoAdjustmentLayer: z.boolean().optional().describe("If true, retries on a new adjustment layer when effect application fails on the target layer.")
  },
  async (params) => {
    // Resolve effect name to matchName using registry if needed
    if (params.effectName && !params.effectMatchName && EFFECT_REGISTRY[params.effectName]) {
      params.effectMatchName = EFFECT_REGISTRY[params.effectName];
    }
    return queueAndWait("applyEffect", params, `apply effect to layer`);
  }
);

// TOOL: apply-effect-template
server.tool(
  "apply-effect-template",
  "Apply a predefined effect template to a layer in After Effects.",
  {
    ...LayerIdentifierSchema,
    templateName: z.enum([
      "gaussian-blur", "directional-blur", "color-balance", "brightness-contrast",
      "curves", "glow", "drop-shadow", "cinematic-look", "text-pop"
    ]).describe("Name of the effect template to apply."),
    customSettings: z.record(z.any()).optional().describe("Optional custom settings to override template defaults.")
  },
  async (params) => queueAndWait("applyEffectTemplate", params, `apply template '${params.templateName}'`)
);

// TOOL: get-effects-help
server.tool(
  "get-effects-help",
  "Get a reference of common After Effects effect matchNames and available templates.",
  {},
  async () => {
    const registryLines = Object.entries(EFFECT_REGISTRY)
      .map(([name, matchName]) => `- ${name}: "${matchName}"`)
      .join("\n");
    return {
      content: [{
        type: "text",
        text: `# Effect Match Name Registry\n\n${registryLines}\n\n## Effect Templates\n- gaussian-blur, directional-blur, color-balance, brightness-contrast\n- curves, glow, drop-shadow, cinematic-look, text-pop`
      }]
    };
  }
);

// TOOL: run-bridge-test
server.tool(
  "run-bridge-test",
  "Run bridge test effects to verify communication and apply test effects.",
  {},
  async () => queueAndWait("bridgeTestEffects", {}, "bridge test effects")
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 2 TOOLS — Effect and Property Control
// ─────────────────────────────────────────────────────────────

// TOOL: getLayerEffects
server.tool(
  "getLayerEffects",
  "List all effects currently applied to a layer, with index, name, matchName, and enabled state.",
  { ...LayerIdentifierSchema },
  async (params) => queueAndWait("getLayerEffects", params, "get layer effects")
);

// TOOL: getEffectProperties
server.tool(
  "getEffectProperties",
  "Read all property names and current values for a specific effect on a layer.",
  {
    ...LayerIdentifierSchema,
    effectIndex: z.number().int().positive().optional().describe("1-based index of the effect on the layer."),
    effectName: z.string().optional().describe("Name of the effect (alternative to effectIndex).")
  },
  async (params) => queueAndWait("getEffectProperties", params, "get effect properties")
);

// TOOL: setEffectProperty
server.tool(
  "setEffectProperty",
  "Modify a property value on an existing effect applied to a layer.",
  {
    ...LayerIdentifierSchema,
    effectIndex: z.number().int().positive().optional().describe("1-based index of the effect."),
    effectName: z.string().optional().describe("Name of the effect."),
    propertyName: z.string().describe("Name of the effect property to modify."),
    value: z.any().describe("New value for the property.")
  },
  async (params) => queueAndWait("setEffectProperty", params, `set effect property '${params.propertyName}'`)
);

// TOOL: removeEffect
server.tool(
  "removeEffect",
  "Remove an effect from a layer.",
  {
    ...LayerIdentifierSchema,
    effectIndex: z.number().int().positive().optional().describe("1-based index of the effect to remove."),
    effectName: z.string().optional().describe("Name of the effect to remove.")
  },
  async (params) => queueAndWait("removeEffect", params, "remove effect")
);

// TOOL: getLayerInfo (enhanced)
server.tool(
  "getLayerInfo",
  "Get comprehensive information about all layers in a composition, including position, scale, rotation, opacity, blending mode, parent, effects, 3D status, text content, and more. Supports filtering by type or specific layer indices.",
  {
    ...CompIdentifierSchema,
    filterType: z.enum(["text", "shape", "avLayer", "camera", "light", "null", "adjustment", "precomp"]).optional().describe("Only return layers of this type."),
    layerIndices: z.array(z.number().int().positive()).optional().describe("Only return layers at these 1-based indices.")
  },
  async (params) => queueAndWait("getLayerInfoEnhanced", params, "get enhanced layer info", 30000)
);

server.tool(
  "inspect-property-tree",
  "Traverse nested After Effects property groups and return canonical property paths for follow-up tools.",
  {
    ...LayerIdentifierSchema,
    ...PropertyTargetSchema,
    maxDepth: z.number().int().positive().optional().describe("Maximum depth to traverse from the target property group."),
    includeValues: z.boolean().optional().describe("Include current serialized values when available.")
  },
  async (params) => queueAndWait("inspectPropertyTree", withNormalizedPropertyPath(params), "inspect property tree", 30000)
);

server.tool(
  "list-project-items",
  "List project panel items with IDs, hierarchy, and optional footage details.",
  {
    typeFilter: z.string().optional().describe("Optional item type filter such as comp, footage, folder, solid, or unknown."),
    folderOnly: z.boolean().optional().describe("Only return folders when true."),
    includeFootageInfo: z.boolean().optional().describe("Include footage source details when available.")
  },
  async (params) => queueAndWait("listProjectItems", params, "list project items", 30000)
);

server.tool(
  "get-project-item-info",
  "Read detailed information for a single project item by ID, index, or name.",
  {
    ...ItemIdentifierSchema
  },
  async (params) => queueAndWait("getProjectItemInfo", params, "get project item info", 30000)
);

server.tool(
  "get-composition-settings",
  "Read composition-level settings including dimensions, frame rate, duration, work area, and background color.",
  {
    ...CompIdentifierSchema
  },
  async (params) => queueAndWait("getCompositionSettings", params, "get composition settings", 30000)
);

server.tool(
  "get-property-metadata",
  "Read property capabilities, dimensions, keyframe count, and expression support for a target property.",
  {
    ...LayerIdentifierSchema,
    ...PropertyTargetSchema
  },
  async (params) => queueAndWait("getPropertyMetadata", withNormalizedPropertyPath(params), "get property metadata", 30000)
);

server.tool(
  "get-property-value",
  "Read the current or sampled value of a layer property using canonical property paths.",
  {
    ...LayerIdentifierSchema,
    ...PropertyTargetSchema,
    time: z.number().optional().describe("Optional sample time in seconds. Defaults to current property value."),
    preExpression: z.boolean().optional().describe("When true, read pre-expression value if supported.")
  },
  async (params) => queueAndWait("getPropertyValue", withNormalizedPropertyPath(params), "get property value", 30000)
);

server.tool(
  "set-property-value",
  "Set a layer property directly using a canonical property path or simple property name.",
  {
    ...LayerIdentifierSchema,
    ...PropertyTargetSchema,
    value: PropertyValueSchema.describe("New value for the property. Scalars, arrays, and structured values are supported."),
    time: z.number().optional().describe("Optional write time in seconds. If omitted and the property already has keyframes, the current comp time is used.")
  },
  async (params) => queueAndWait("setPropertyValue", withNormalizedPropertyPath(params), "set property value", 30000)
);

server.tool(
  "get-expression",
  "Read the current expression, enabled state, and expression error for a property.",
  {
    ...LayerIdentifierSchema,
    ...PropertyTargetSchema
  },
  async (params) => queueAndWait("getExpression", withNormalizedPropertyPath(params), "get expression", 30000)
);

// TOOL: search-text-layers (canonical)
server.tool(
  "search-text-layers",
  "Search all text layers in a composition for matching content. Returns layer index, name, text, and timing.",
  {
    ...CompIdentifierSchema,
    searchText: z.string().describe("Text to search for in text layers."),
    caseSensitive: z.boolean().optional().default(false).describe("Whether search is case-sensitive (default: false).")
  },
  async (params) => queueAndWait("searchTextLayers", params, "search text layers", 30000)
);

// TOOL: searchTextLayers (compatibility)
server.tool(
  "searchTextLayers",
  "Compatibility alias for search-text-layers.",
  {
    ...CompIdentifierSchema,
    searchText: z.string().describe("Text to search for in text layers."),
    caseSensitive: z.boolean().optional().default(false).describe("Whether search is case-sensitive (default: false).")
  },
  async (params) => queueAndWait("searchTextLayers", params, "search text layers", 30000)
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 3 TOOLS — Animation and Keyframes
// ─────────────────────────────────────────────────────────────

// TOOL: getKeyframes
server.tool(
  "getKeyframes",
  "Read all existing keyframes on a layer property, including time, value, and interpolation type.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property to read keyframes from (e.g., 'Position', 'Opacity').")
  },
  async (params) => queueAndWait("getKeyframes", params, `get keyframes for '${params.propertyName}'`)
);

// TOOL: removeKeyframe
server.tool(
  "removeKeyframe",
  "Remove a keyframe from a layer property by index or time.",
  {
    ...LayerIdentifierSchema,
    propertyName: z.string().describe("Name of the property."),
    keyframeIndex: z.number().int().positive().optional().describe("1-based index of the keyframe to remove."),
    time: z.number().optional().describe("Time (in seconds) of the keyframe to remove. Used if keyframeIndex not provided.")
  },
  async (params) => queueAndWait("removeKeyframe", params, `remove keyframe from '${params.propertyName}'`)
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 4 TOOLS — Masks and Track Mattes
// ─────────────────────────────────────────────────────────────

// TOOL: addMask
server.tool(
  "addMask",
  "Add a mask to a layer. Supports rectangle, ellipse, or custom path shapes.",
  {
    ...LayerIdentifierSchema,
    maskShape: z.enum(["rectangle", "ellipse", "path"]).describe("Shape type for the mask."),
    vertices: z.array(z.array(z.number())).optional().describe("Vertex points [[x,y], ...] for path masks."),
    position: z.array(z.number()).optional().describe("Center position [x,y] for rect/ellipse masks."),
    size: z.array(z.number()).optional().describe("Size [w,h] for rect/ellipse masks."),
    feather: z.number().optional().describe("Mask feather amount (pixels)."),
    opacity: z.number().optional().describe("Mask opacity (0-100)."),
    mode: z.enum(["add", "subtract", "intersect", "lighten", "darken", "difference"]).optional().describe("Mask mode."),
    inverted: z.boolean().optional().describe("Whether the mask is inverted.")
  },
  async (params) => queueAndWait("addMask", params, "add mask")
);

// TOOL: setTrackMatte
server.tool(
  "setTrackMatte",
  "Set the track matte type for a layer (Alpha, Luma, etc.).",
  {
    ...LayerIdentifierSchema,
    matteType: z.enum(["none", "alpha", "alphaInverted", "luma", "lumaInverted"]).describe("Track matte type.")
  },
  async (params) => queueAndWait("setTrackMatte", params, `set track matte to '${params.matteType}'`)
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 5 TOOLS — Project and Asset Management
// ─────────────────────────────────────────────────────────────

// TOOL: import-file (canonical)
server.tool(
  "import-file",
  "Import a file (footage, image, audio) into the After Effects project.",
  {
    filePath: z.string().describe("Absolute path to the file to import."),
    importAs: z.enum(["footage", "composition", "project"]).optional().describe("How to import the file (default: footage).")
  },
  async (params) => queueAndWait("importFile", params, "import file")
);

// TOOL: importFile (compatibility)
server.tool(
  "importFile",
  "Compatibility alias for import-file.",
  {
    filePath: z.string().describe("Absolute path to the file to import."),
    importAs: z.enum(["footage", "composition", "project"]).optional().describe("How to import the file (default: footage).")
  },
  async (params) => queueAndWait("importFile", params, "import file")
);

server.tool(
  "import-from-url",
  "Download a remote file and import it into the After Effects project.",
  {
    url: z.string().url().describe("HTTP/HTTPS URL of the asset to download."),
    importAs: z.enum(["footage", "composition", "project"]).optional().describe("How to import the file (default: footage).")
  },
  async (params) => {
    try {
      const downloadedPath = await downloadToTempFile(params.url);
      return queueAndWait("importFile", {
        filePath: downloadedPath,
        importAs: params.importAs
      }, "import file from URL", 15000);
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ status: "error", message: String(error) }, null, 2) }],
        isError: true
      };
    }
  }
);

server.tool(
  "importFromUrl",
  "Compatibility alias for import-from-url.",
  {
    url: z.string().url().describe("HTTP/HTTPS URL of the asset to download."),
    importAs: z.enum(["footage", "composition", "project"]).optional().describe("How to import the file (default: footage).")
  },
  async (params) => {
    try {
      const downloadedPath = await downloadToTempFile(params.url);
      return queueAndWait("importFile", {
        filePath: downloadedPath,
        importAs: params.importAs
      }, "import file from URL", 15000);
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ status: "error", message: String(error) }, null, 2) }],
        isError: true
      };
    }
  }
);

// TOOL: add-layer-from-item (canonical)
server.tool(
  "add-layer-from-item",
  "Add an existing project item (footage, precomp, image) to a composition as a new layer.",
  {
    ...CompIdentifierSchema,
    itemId: z.number().int().positive().describe("Project item ID to add as a layer."),
    startTime: z.number().optional().describe("Start time for the layer (seconds)."),
    atIndex: z.number().int().positive().optional().describe("Position in the layer stack.")
  },
  async (params) => queueAndWait("addLayerFromItem", params, "add layer from project item")
);

// TOOL: addLayerFromItem (compatibility)
server.tool(
  "addLayerFromItem",
  "Compatibility alias for add-layer-from-item.",
  {
    ...CompIdentifierSchema,
    itemId: z.number().int().positive().describe("Project item ID to add as a layer."),
    startTime: z.number().optional().describe("Start time for the layer (seconds)."),
    atIndex: z.number().int().positive().optional().describe("Position in the layer stack.")
  },
  async (params) => queueAndWait("addLayerFromItem", params, "add layer from project item")
);

// TOOL: precompose-layers (canonical)
server.tool(
  "precompose-layers",
  "Precompose selected layers into a new composition.",
  {
    ...CompIdentifierSchema,
    layerIndices: z.array(z.number().int().positive()).describe("Array of 1-based layer indices to precompose."),
    name: z.string().describe("Name for the new precomp."),
    moveAttributes: z.boolean().optional().describe("Move all attributes into new comp (default: true).")
  },
  async (params) => queueAndWait("precomposeLayers", params, `precompose layers as '${params.name}'`)
);

// TOOL: precomposeLayers (compatibility)
server.tool(
  "precomposeLayers",
  "Compatibility alias for precompose-layers.",
  {
    ...CompIdentifierSchema,
    layerIndices: z.array(z.number().int().positive()).describe("Array of 1-based layer indices to precompose."),
    name: z.string().describe("Name for the new precomp."),
    moveAttributes: z.boolean().optional().describe("Move all attributes into new comp (default: true).")
  },
  async (params) => queueAndWait("precomposeLayers", params, `precompose layers as '${params.name}'`)
);

// TOOL: duplicate-layer (canonical)
server.tool(
  "duplicate-layer",
  "Duplicate an existing layer in the composition.",
  { ...LayerIdentifierSchema },
  async (params) => queueAndWait("duplicateLayer", params, "duplicate layer")
);

// TOOL: duplicateLayer (compatibility)
server.tool(
  "duplicateLayer",
  "Compatibility alias for duplicate-layer.",
  { ...LayerIdentifierSchema },
  async (params) => queueAndWait("duplicateLayer", params, "duplicate layer")
);

server.tool(
  "get-active-comp",
  "Get the currently active composition in After Effects.",
  {},
  async () => queueAndWait("getActiveComp", {}, "get active composition", 12000)
);

server.tool(
  "getActiveComp",
  "Compatibility alias for get-active-comp.",
  {},
  async () => queueAndWait("getActiveComp", {}, "get active composition", 12000)
);

server.tool(
  "save-project",
  "Save the current After Effects project. Use saveAsPath to save to a new location.",
  {
    saveAsPath: z.string().optional().describe("Absolute path to save as a .aep file.")
  },
  async (params) => queueAndWait("saveProject", params, "save project")
);

server.tool(
  "saveProject",
  "Compatibility alias for save-project.",
  {
    saveAsPath: z.string().optional().describe("Absolute path to save as a .aep file.")
  },
  async (params) => queueAndWait("saveProject", params, "save project")
);

server.tool(
  "open-project",
  "Open an After Effects project file. Requires closeCurrent=true when a project is already open.",
  {
    filePath: z.string().describe("Absolute path to an .aep file."),
    closeCurrent: z.boolean().optional().describe("Required true to close current project context before opening another.")
  },
  async (params) => queueAndWait("openProject", params, "open project", 15000)
);

server.tool(
  "openProject",
  "Compatibility alias for open-project.",
  {
    filePath: z.string().describe("Absolute path to an .aep file."),
    closeCurrent: z.boolean().optional().describe("Required true to close current project context before opening another.")
  },
  async (params) => queueAndWait("openProject", params, "open project", 15000)
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 6 TOOLS — Rendering and Output
// ─────────────────────────────────────────────────────────────

// TOOL: add-to-render-queue (canonical)
server.tool(
  "add-to-render-queue",
  "Add a composition to the After Effects render queue.",
  {
    ...CompIdentifierSchema,
    outputPath: z.string().optional().describe("Output file path for the render."),
    format: z.enum(["mp4", "mov", "avi", "png_sequence", "jpg_sequence"]).optional().describe("Output format.")
  },
  async (params) => queueAndWait("addToRenderQueue", params, "add to render queue")
);

// TOOL: addToRenderQueue (compatibility)
server.tool(
  "addToRenderQueue",
  "Compatibility alias for add-to-render-queue.",
  {
    ...CompIdentifierSchema,
    outputPath: z.string().optional().describe("Output file path for the render."),
    format: z.enum(["mp4", "mov", "avi", "png_sequence", "jpg_sequence"]).optional().describe("Output format.")
  },
  async (params) => queueAndWait("addToRenderQueue", params, "add to render queue")
);

// TOOL: start-render (canonical)
server.tool(
  "start-render",
  "Start rendering all items in the After Effects render queue.",
  {},
  async () => queueAndWait("startRender", {}, "start render", 120000)
);

// TOOL: startRender (compatibility)
server.tool(
  "startRender",
  "Compatibility alias for start-render.",
  {},
  async () => queueAndWait("startRender", {}, "start render", 120000) // 2 min timeout for renders
);

// TOOL: capture-frame (canonical)
server.tool(
  "capture-frame",
  "Capture a screenshot of the current composition at a specific time.",
  {
    ...CompIdentifierSchema,
    time: z.number().optional().describe("Time in seconds to capture (default: current time)."),
    outputPath: z.string().describe("Output file path for the screenshot."),
    format: z.enum(["png", "jpg"]).optional().describe("Image format (default: png).")
  },
  async (params) => queueAndWait("captureFrame", params, "capture frame")
);

// TOOL: captureFrame (compatibility)
server.tool(
  "captureFrame",
  "Compatibility alias for capture-frame.",
  {
    ...CompIdentifierSchema,
    time: z.number().optional().describe("Time in seconds to capture (default: current time)."),
    outputPath: z.string().describe("Output file path for the screenshot."),
    format: z.enum(["png", "jpg"]).optional().describe("Image format (default: png).")
  },
  async (params) => queueAndWait("captureFrame", params, "capture frame")
);

server.tool(
  "render-composition",
  "Render one composition in one call (queue + render).",
  {
    ...CompIdentifierSchema,
    outputPath: z.string().optional().describe("Optional output file path for render output."),
    format: z.enum(["mp4", "mov", "avi", "png_sequence", "jpg_sequence"]).optional().describe("Optional output format.")
  },
  async (params) => {
    const queued = await queueAndWait("addToRenderQueue", params, "add to render queue", 15000);
    if (isBridgeErrorPayload(getToolResultText(queued))) {
      return queued;
    }
    return queueAndWait("startRender", {}, "start render", 120000);
  }
);

server.tool(
  "renderComposition",
  "Compatibility alias for render-composition.",
  {
    ...CompIdentifierSchema,
    outputPath: z.string().optional().describe("Optional output file path for render output."),
    format: z.enum(["mp4", "mov", "avi", "png_sequence", "jpg_sequence"]).optional().describe("Optional output format.")
  },
  async (params) => {
    const queued = await queueAndWait("addToRenderQueue", params, "add to render queue", 15000);
    if (isBridgeErrorPayload(getToolResultText(queued))) {
      return queued;
    }
    return queueAndWait("startRender", {}, "start render", 120000);
  }
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 7 TOOLS — Quality of Life
// ─────────────────────────────────────────────────────────────

// TOOL: execute-batch (canonical)
server.tool(
  "execute-batch",
  "Execute multiple operations in a single call. Accepts kebab-case names publicly and camelCase for compatibility.",
  {
    operations: z.array(z.object({
      tool: z.string().describe("Command name (canonical: kebab-case, e.g., 'apply-effect')."),
      parameters: z.record(z.any()).describe("Parameters for the command.")
    })).describe("Array of operations to execute in sequence.")
  },
  async (params) => {
    const normalized = {
      operations: normalizeBatchOperations(params.operations)
    };
    return queueAndWait("executeBatch", normalized, "execute batch", 30000);
  }
);

// TOOL: executeBatch (compatibility)
server.tool(
  "executeBatch",
  "Compatibility alias for execute-batch.",
  {
    operations: z.array(z.object({
      tool: z.string().describe("Command name (camelCase or kebab-case)."),
      parameters: z.record(z.any()).describe("Parameters for the command.")
    })).describe("Array of operations to execute in sequence.")
  },
  async (params) => {
    const normalized = {
      operations: normalizeBatchOperations(params.operations)
    };
    return queueAndWait("executeBatch", normalized, "execute batch", 30000);
  }
);

// TOOL: undo
server.tool(
  "undo",
  "Undo the last operation(s) in After Effects.",
  {
    steps: z.number().int().positive().optional().describe("Number of undo steps (default: 1).")
  },
  async (params) => queueAndWait("undo", params || {}, "undo")
);

// TOOL: redo
server.tool(
  "redo",
  "Redo previously undone operation(s) in After Effects.",
  {
    steps: z.number().int().positive().optional().describe("Number of redo steps (default: 1).")
  },
  async (params) => queueAndWait("redo", params || {}, "redo")
);

// ─────────────────────────────────────────────────────────────
// PRIORITY 8 TOOLS — Advanced Features
// ─────────────────────────────────────────────────────────────

// 8.1 — Text Layer Property Control

server.tool(
  "setTextProperties",
  "Compatibility alias for set-text-properties.",
  {
    ...LayerIdentifierSchema,
    text: z.string().optional().describe("New text content."),
    fontFamily: z.string().optional().describe("Font family name (e.g., 'Arial', 'Helvetica Neue')."),
    fontSize: z.number().positive().optional().describe("Font size in pixels."),
    fillColor: z.array(z.number()).optional().describe("Fill color as [r, g, b] (0-1 range)."),
    strokeColor: z.array(z.number()).optional().describe("Stroke color as [r, g, b] (0-1 range)."),
    strokeWidth: z.number().optional().describe("Stroke width."),
    tracking: z.number().optional().describe("Tracking value (letter spacing)."),
    leading: z.number().optional().describe("Leading value (line spacing in pixels)."),
    justification: z.enum(["left", "center", "right", "full"]).optional().describe("Paragraph justification."),
    applyStroke: z.boolean().optional().describe("Whether to apply stroke."),
    applyFill: z.boolean().optional().describe("Whether to apply fill.")
  },
  async (params) => queueAndWait("setTextProperties", params, "set text properties")
);

server.tool(
  "set-text-properties",
  "Set text document properties on a text layer: font, size, color, tracking, leading, justification, and text content.",
  {
    ...LayerIdentifierSchema,
    text: z.string().optional().describe("New text content."),
    fontFamily: z.string().optional().describe("Font family name (e.g., 'Arial', 'Helvetica Neue')."),
    fontSize: z.number().positive().optional().describe("Font size in pixels."),
    fillColor: z.array(z.number()).optional().describe("Fill color as [r, g, b] (0-1 range)."),
    strokeColor: z.array(z.number()).optional().describe("Stroke color as [r, g, b] (0-1 range)."),
    strokeWidth: z.number().optional().describe("Stroke width."),
    tracking: z.number().optional().describe("Tracking value (letter spacing)."),
    leading: z.number().optional().describe("Leading value (line spacing in pixels)."),
    justification: z.enum(["left", "center", "right", "full"]).optional().describe("Paragraph justification."),
    applyStroke: z.boolean().optional().describe("Whether to apply stroke."),
    applyFill: z.boolean().optional().describe("Whether to apply fill.")
  },
  async (params) => queueAndWait("setTextProperties", params, "set text properties")
);

server.tool(
  "getTextProperties",
  "Compatibility alias for get-text-properties.",
  {
    ...LayerIdentifierSchema,
    layerIndices: z.array(z.number().int().positive()).optional().describe("Get text from multiple layers at once. When provided, layerIndex/layerName are ignored.")
  },
  async (params) => queueAndWait("getTextProperties", params, "get text properties", 30000)
);

server.tool(
  "get-text-properties",
  "Read all text document properties from a text layer: font, size, color, tracking, leading, justification, and text content. Supports batch mode via layerIndices.",
  {
    ...LayerIdentifierSchema,
    layerIndices: z.array(z.number().int().positive()).optional().describe("Get text from multiple layers at once. When provided, layerIndex/layerName are ignored.")
  },
  async (params) => queueAndWait("getTextProperties", params, "get text properties", 30000)
);

// 8.2 — Shape Layer Path Control

server.tool(
  "modifyShapePath",
  "Modify the path of an existing shape group on a shape layer. Can update vertices, in/out tangents, and closed state.",
  {
    ...LayerIdentifierSchema,
    shapeGroupIndex: z.number().int().positive().optional().describe("1-based index of the shape group."),
    shapeGroupName: z.string().optional().describe("Name of the shape group."),
    vertices: z.array(z.array(z.number())).optional().describe("New vertex points [[x,y], ...]."),
    inTangents: z.array(z.array(z.number())).optional().describe("In tangents for each vertex."),
    outTangents: z.array(z.array(z.number())).optional().describe("Out tangents for each vertex."),
    closed: z.boolean().optional().describe("Whether the path is closed.")
  },
  async (params) => queueAndWait("modifyShapePath", params, "modify shape path")
);

server.tool(
  "setShapeColors",
  "Set fill and/or stroke colors on an existing shape layer group.",
  {
    ...LayerIdentifierSchema,
    shapeGroupIndex: z.number().int().positive().optional().describe("1-based index of the shape group."),
    shapeGroupName: z.string().optional().describe("Name of the shape group."),
    fillColor: z.array(z.number()).optional().describe("Fill color [r, g, b] (0-1 range)."),
    strokeColor: z.array(z.number()).optional().describe("Stroke color [r, g, b] (0-1 range)."),
    strokeWidth: z.number().optional().describe("Stroke width in pixels."),
    fillOpacity: z.number().optional().describe("Fill opacity (0-100)."),
    strokeOpacity: z.number().optional().describe("Stroke opacity (0-100).")
  },
  async (params) => queueAndWait("setShapeColors", params, "set shape colors")
);

server.tool(
  "addShapeGroup",
  "Add a new shape group (rectangle, ellipse, polygon, star, or custom path) to an existing shape layer.",
  {
    ...LayerIdentifierSchema,
    shapeType: z.enum(["rectangle", "ellipse", "polygon", "star", "path"]).describe("Type of shape to add."),
    size: z.array(z.number()).optional().describe("Size [w, h] for rect/ellipse."),
    position: z.array(z.number()).optional().describe("Position [x, y] of the shape group."),
    points: z.number().int().optional().describe("Number of points for polygon/star."),
    innerRadius: z.number().optional().describe("Inner radius for star shapes."),
    outerRadius: z.number().optional().describe("Outer radius for polygon/star."),
    vertices: z.array(z.array(z.number())).optional().describe("Vertices for custom path shapes."),
    fillColor: z.array(z.number()).optional().describe("Fill color [r, g, b] (0-1 range)."),
    strokeColor: z.array(z.number()).optional().describe("Stroke color [r, g, b] (0-1 range)."),
    strokeWidth: z.number().optional().describe("Stroke width.")
  },
  async (params) => queueAndWait("addShapeGroup", params, "add shape group")
);

// 8.3 — Camera and Light Layers

server.tool(
  "createCamera",
  "Create a camera layer in the composition with specified settings.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the camera (default: 'Camera')."),
    type: z.enum(["oneNode", "twoNode"]).optional().describe("Camera type (default: twoNode)."),
    zoom: z.number().positive().optional().describe("Camera zoom value in pixels."),
    position: z.array(z.number()).optional().describe("Camera position [x, y, z]."),
    pointOfInterest: z.array(z.number()).optional().describe("Point of interest [x, y, z] for two-node cameras.")
  },
  async (params) => queueAndWait("createCamera", params, `create camera '${params.name || "Camera"}'`)
);

server.tool(
  "createLight",
  "Create a light layer in the composition.",
  {
    ...CompIdentifierSchema,
    name: z.string().optional().describe("Name for the light (default: 'Light')."),
    lightType: z.enum(["point", "spot", "ambient", "parallel"]).optional().describe("Light type (default: point)."),
    color: z.array(z.number()).optional().describe("Light color [r, g, b] (0-1 range)."),
    intensity: z.number().optional().describe("Light intensity (0-400%)."),
    position: z.array(z.number()).optional().describe("Light position [x, y, z]."),
    coneAngle: z.number().optional().describe("Cone angle for spot lights (degrees)."),
    coneFeather: z.number().optional().describe("Cone feather for spot lights (0-100%).")
  },
  async (params) => queueAndWait("createLight", params, `create ${params.lightType || "point"} light`)
);

// 8.4 — Markers

server.tool(
  "addMarker",
  "Add a marker to a layer or composition. Markers can have comments, chapter names, URLs, and duration.",
  {
    ...LayerIdentifierSchema,
    time: z.number().describe("Time in seconds where the marker should be placed."),
    comment: z.string().optional().describe("Text comment for the marker."),
    chapter: z.string().optional().describe("Chapter name for the marker."),
    url: z.string().optional().describe("URL associated with the marker."),
    duration: z.number().optional().describe("Duration of the marker in seconds."),
    label: z.number().int().optional().describe("Color label index (0-16)."),
    isCompMarker: z.boolean().optional().describe("If true, adds to composition instead of layer.")
  },
  async (params) => queueAndWait("addMarker", params, "add marker")
);

server.tool(
  "getMarkers",
  "Read all markers from a layer or composition, including time, comment, chapter, and duration.",
  {
    ...LayerIdentifierSchema,
    isCompMarker: z.boolean().optional().describe("If true, reads from composition instead of layer.")
  },
  async (params) => queueAndWait("getMarkers", params, "get markers")
);

server.tool(
  "removeMarker",
  "Remove a marker from a layer or composition by index or nearest time.",
  {
    ...LayerIdentifierSchema,
    markerIndex: z.number().int().positive().optional().describe("1-based index of the marker to remove."),
    time: z.number().optional().describe("Time of the marker to remove (nearest match)."),
    isCompMarker: z.boolean().optional().describe("If true, removes from composition instead of layer.")
  },
  async (params) => queueAndWait("removeMarker", params, "remove marker")
);

// 8.5 — Time Remapping

server.tool(
  "setTimeRemapping",
  "Enable/disable time remapping on a layer and optionally set time remap keyframes.",
  {
    ...LayerIdentifierSchema,
    enabled: z.boolean().describe("Whether to enable time remapping."),
    keyframes: z.array(z.object({
      time: z.number().describe("Keyframe time in seconds."),
      value: z.number().describe("Remapped time value in seconds.")
    })).optional().describe("Array of time remap keyframes to set.")
  },
  async (params) => queueAndWait("setTimeRemapping", params, "set time remapping")
);

// 8.6 — Motion Blur and Frame Blending

server.tool(
  "setMotionBlur",
  "Toggle motion blur for a specific layer and/or the entire composition.",
  {
    ...LayerIdentifierSchema,
    layerMotionBlur: z.boolean().optional().describe("Enable/disable motion blur on the layer."),
    compMotionBlur: z.boolean().optional().describe("Enable/disable motion blur at the composition level.")
  },
  async (params) => queueAndWait("setMotionBlur", params, "set motion blur")
);

server.tool(
  "setFrameBlending",
  "Set frame blending mode for a layer and/or enable at the composition level.",
  {
    ...LayerIdentifierSchema,
    mode: z.enum(["none", "frameBlending", "pixelMotion"]).describe("Frame blending mode for the layer."),
    compFrameBlending: z.boolean().optional().describe("Enable/disable frame blending at the composition level.")
  },
  async (params) => queueAndWait("setFrameBlending", params, "set frame blending")
);

// ─────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────

async function main() {
  console.error("After Effects MCP Server v2.0 starting...");
  console.error(`Scripts directory: ${SCRIPTS_DIR}`);
  console.error(`Temp directory: ${TEMP_DIR}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("After Effects MCP Server running...");
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
