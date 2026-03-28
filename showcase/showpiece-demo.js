import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "fs";
import * as path from "path";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const SHOWCASE_COMP = "MCP_Wonder_Showpiece";
const OUTPUT_DIR = path.join(process.cwd(), "showcase", "output");
const CAPTURE_PATH = path.join(OUTPUT_DIR, "showpiece-frame.png");

function safeParseJson(input) {
  if (!input || typeof input !== "string") {
    return null;
  }
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function pickTextContent(response) {
  if (!response || !Array.isArray(response.content)) {
    return "";
  }
  const textPart = response.content.find((part) => part.type === "text");
  return textPart?.text || "";
}

async function callTool(client, steps, name, toolArgs, optional = false) {
  const started = Date.now();
  try {
    const response = await client.callTool({ name, arguments: toolArgs });
    const elapsed = Date.now() - started;
    const text = pickTextContent(response);
    const parsed = safeParseJson(text);

    const parsedHasError = Boolean(parsed && (parsed.status === "error" || parsed.error));
    const ok = !response.isError && !parsedHasError;
    const message = parsed?.message || parsed?.error || text.slice(0, 140) || "(no text payload)";

    steps.push({
      name,
      ok,
      optional,
      elapsed,
      message,
    });

    const icon = ok ? "PASS" : optional ? "WARN" : "FAIL";
    console.log(`[${icon}] ${name} (${elapsed}ms) -> ${message}`);

    return { ok, response, text, parsed };
  } catch (error) {
    const elapsed = Date.now() - started;
    const message = String(error);

    steps.push({
      name,
      ok: false,
      optional,
      elapsed,
      message,
    });

    const icon = optional ? "WARN" : "FAIL";
    console.log(`[${icon}] ${name} (${elapsed}ms) -> ${message}`);
    return { ok: false, response: null, text: "", parsed: null };
  }
}

function listPlannedHighlights() {
  const lines = [
    "- Create a 2560x1440 cinematic composition",
    "- Build multiple layers in one call using executeBatch",
    "- Style text, shape, solids, nulls, camera, and light",
    "- Apply effect templates and animated keyframes",
    "- Add expression-driven behavior",
    "- Enable motion blur and frame blending",
    "- Capture a final frame to showcase/output/showpiece-frame.png",
  ];
  console.log("Planned showcase flow:");
  for (const line of lines) {
    console.log(line);
  }
}

function findLayerIndex(layerInfo, targetName) {
  if (!layerInfo || !Array.isArray(layerInfo.layers)) {
    return null;
  }
  const exact = layerInfo.layers.find((l) => l.name === targetName);
  if (exact) {
    return exact.index;
  }
  const fuzzy = layerInfo.layers.find((l) => typeof l.name === "string" && l.name.indexOf(targetName) !== -1);
  return fuzzy ? fuzzy.index : null;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
  });

  const client = new Client({
    name: "showpiece-client",
    version: "1.0.0",
  });

  const steps = [];

  await client.connect(transport);
  console.log("Connected to MCP server.");

  const tools = await client.listTools();
  const toolCount = Array.isArray(tools?.tools) ? tools.tools.length : 0;
  console.log(`Server exposes ${toolCount} tools.`);

  const required = [
    "create-composition",
    "executeBatch",
    "getLayerInfo",
    "setLayerKeyframe",
    "setLayerExpression",
    "apply-effect-template",
    "setTextProperties",
    "setMotionBlur",
    "setFrameBlending",
    "captureFrame",
  ];

  const names = new Set((tools?.tools || []).map((t) => t.name));
  const missing = required.filter((name) => !names.has(name));
  if (missing.length > 0) {
    console.log(`Missing required tools: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log("Dry-run mode enabled. No AE mutations executed.");
    listPlannedHighlights();
    process.exit(0);
  }

  console.log("Starting cinematic showpiece build...");

  await callTool(client, steps, "create-composition", {
    name: SHOWCASE_COMP,
    width: 2560,
    height: 1440,
    duration: 12,
    frameRate: 30,
    backgroundColor: { r: 8, g: 10, b: 24 },
  });

  await callTool(client, steps, "executeBatch", {
    operations: [
      {
        tool: "createSolidLayer",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Midnight Base",
          color: [0.05, 0.07, 0.14],
          size: [2560, 1440],
          position: [1280, 720],
          duration: 12,
        },
      },
      {
        tool: "createSolidLayer",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Glow Fog",
          color: [0.07, 0.18, 0.26],
          size: [1800, 1000],
          position: [1280, 720],
          duration: 12,
        },
      },
      {
        tool: "createShapeLayer",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Hero Star",
          shapeType: "star",
          size: [460, 460],
          points: 6,
          fillColor: [0.98, 0.7, 0.18],
          strokeColor: [1, 1, 1],
          strokeWidth: 3,
          position: [1280, 720],
          duration: 12,
        },
      },
      {
        tool: "createTextLayer",
        parameters: {
          compName: SHOWCASE_COMP,
          text: "MCP x After Effects",
          fontFamily: "Arial-BoldMT",
          fontSize: 126,
          color: [1, 1, 1],
          position: [1280, 450],
          alignment: "center",
          duration: 12,
        },
      },
      {
        tool: "createTextLayer",
        parameters: {
          compName: SHOWCASE_COMP,
          text: "Realtime cinematic automation",
          fontFamily: "ArialMT",
          fontSize: 52,
          color: [0.75, 0.88, 1],
          position: [1280, 560],
          alignment: "center",
          duration: 12,
        },
      },
      {
        tool: "createNullObject",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Global Controller",
        },
      },
      {
        tool: "createCamera",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Hero Camera",
          type: "twoNode",
          zoom: 1800,
          position: [1280, 720, -1800],
          pointOfInterest: [1280, 720, 0],
        },
      },
      {
        tool: "createLight",
        parameters: {
          compName: SHOWCASE_COMP,
          name: "Sun Key",
          lightType: "spot",
          color: [1, 0.93, 0.68],
          intensity: 135,
          position: [900, 360, -900],
          coneAngle: 75,
          coneFeather: 45,
        },
      },
    ],
  });

  const layerInfoResult = await callTool(client, steps, "getLayerInfo", {
    compName: SHOWCASE_COMP,
  });

  const layerInfo = layerInfoResult.parsed || safeParseJson(layerInfoResult.text);
  const heroStarIndex = findLayerIndex(layerInfo, "Hero Star");
  const titleIndex = findLayerIndex(layerInfo, "MCP x After Effects");
  const subtitleIndex = findLayerIndex(layerInfo, "Realtime cinematic automation");
  const controllerIndex = findLayerIndex(layerInfo, "Global Controller");
  const glowFogIndex = findLayerIndex(layerInfo, "Glow Fog");

  if (heroStarIndex && controllerIndex) {
    await callTool(client, steps, "setLayerParent", {
      compName: SHOWCASE_COMP,
      layerIndex: heroStarIndex,
      parentLayerIndex: controllerIndex,
    });
  }

  if (titleIndex && controllerIndex) {
    await callTool(client, steps, "setLayerParent", {
      compName: SHOWCASE_COMP,
      layerIndex: titleIndex,
      parentLayerIndex: controllerIndex,
    });
  }

  if (subtitleIndex) {
    await callTool(client, steps, "setTextProperties", {
      compName: SHOWCASE_COMP,
      layerIndex: subtitleIndex,
      tracking: 70,
      leading: 60,
      fillColor: [0.72, 0.9, 1],
      text: "Realtime cinematic automation by MCP",
    });
  }

  if (titleIndex) {
    await callTool(client, steps, "apply-effect-template", {
      compName: SHOWCASE_COMP,
      layerIndex: titleIndex,
      templateName: "text-pop",
    });
  }

  if (heroStarIndex) {
    await callTool(client, steps, "setLayerKeyframe", {
      compName: SHOWCASE_COMP,
      layerIndex: heroStarIndex,
      propertyName: "Scale",
      timeInSeconds: 0,
      value: [35, 35],
    });

    await callTool(client, steps, "setLayerKeyframe", {
      compName: SHOWCASE_COMP,
      layerIndex: heroStarIndex,
      propertyName: "Scale",
      timeInSeconds: 2.2,
      value: [115, 115],
    });

    await callTool(client, steps, "setLayerExpression", {
      compName: SHOWCASE_COMP,
      layerIndex: heroStarIndex,
      propertyName: "Rotation",
      expressionString: "time*45",
    }, true);

    await callTool(client, steps, "setBlendingMode", {
      compName: SHOWCASE_COMP,
      layerIndex: heroStarIndex,
      blendMode: "screen",
    });
  }

  if (controllerIndex) {
    await callTool(client, steps, "setLayerKeyframe", {
      compName: SHOWCASE_COMP,
      layerIndex: controllerIndex,
      propertyName: "Position",
      timeInSeconds: 0,
      value: [1280, 720, 0],
    });

    await callTool(client, steps, "setLayerKeyframe", {
      compName: SHOWCASE_COMP,
      layerIndex: controllerIndex,
      propertyName: "Position",
      timeInSeconds: 7,
      value: [1340, 680, 0],
    });
  }

  if (glowFogIndex) {
    await callTool(client, steps, "addMask", {
      compName: SHOWCASE_COMP,
      layerIndex: glowFogIndex,
      maskShape: "ellipse",
      position: [1280, 720],
      size: [1400, 900],
      feather: 220,
      opacity: 85,
      mode: "add",
    }, true);
  }

  await callTool(client, steps, "setMotionBlur", {
    compName: SHOWCASE_COMP,
    layerIndex: heroStarIndex || 1,
    layerMotionBlur: true,
    compMotionBlur: true,
  }, true);

  await callTool(client, steps, "setFrameBlending", {
    compName: SHOWCASE_COMP,
    layerIndex: heroStarIndex || 1,
    mode: "pixelMotion",
    compFrameBlending: true,
  }, true);

  await callTool(client, steps, "captureFrame", {
    compName: SHOWCASE_COMP,
    time: 4,
    outputPath: CAPTURE_PATH,
    format: "png",
  }, true);

  const passed = steps.filter((s) => s.ok).length;
  const warned = steps.filter((s) => !s.ok && s.optional).length;
  const failed = steps.filter((s) => !s.ok && !s.optional).length;

  console.log("\nShowpiece run complete.");
  console.log(`Passed: ${passed} | Warnings: ${warned} | Failed: ${failed}`);
  console.log(`Capture target: ${CAPTURE_PATH}`);

  if (failed > 0) {
    console.log("Some required operations failed. Make sure After Effects is open and the mcp-bridge-auto panel is running.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal showcase error:", error);
  process.exit(1);
});
