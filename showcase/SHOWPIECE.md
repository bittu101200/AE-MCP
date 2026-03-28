# MCP Showpiece

This showpiece script demonstrates the strongest parts of this MCP server in one cinematic pass.

## What it demonstrates

- Composition creation
- Multi-operation orchestration with `executeBatch`
- Layer parenting, blending, and masks
- Text styling and effect templates
- Keyframes and expressions
- Camera/light creation
- Motion blur + frame blending toggles
- Frame capture output

## Prerequisites

1. Build the server:

```bash
npm run build
```

2. Install and open the AE bridge panel:

```bash
npm run install-bridge
```

In After Effects:

- Open `Window > mcp-bridge-auto.jsx`
- Enable auto-run in the panel
- Ensure scripting/network access is enabled in AE preferences

## Run

```bash
npm run showcase
```

The script creates a composition named `MCP_Wonder_Showpiece` and attempts to capture a frame at:

- `showcase/output/showpiece-frame.png`

## Dry-run mode

If you only want to validate tool availability and print the planned flow:

```bash
node showcase/showpiece-demo.js --dry-run
```

## Notes

- If After Effects or the bridge panel is not active, calls will timeout and be reported in the summary.
- The script continues through optional steps so you can still see partial output.
