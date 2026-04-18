# 🎬 AE-MCP for After Effects

![Node.js](https://img.shields.io/badge/node-%3E=18.x-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-success)
![License](https://img.shields.io/github/license/bittu101200/AE-MCP)
![Platform](https://img.shields.io/badge/platform-after%20effects-blue)

✨ AE-MCP is a Model Context Protocol (MCP) server for Adobe After Effects that gives AI assistants and custom tools a reliable way to automate compositions, layers, animation, effects, rendering, and project workflows.

Created, maintained, and actively expanded by Bhupendra Sharma.

This repository is the primary home for the current AE-MCP implementation, including the bridge workflow, automation surface, tooling, and ongoing product improvements.

## Table of Contents
- [Features](#-features)
  - [Compositions & Project](#-compositions--project)
  - [Layer Management](#-layer-management)
  - [Animation & Properties](#-animation--properties)
  - [Effects & Rendering](#-effects--rendering)
  - [Productivity](#-productivity)
- [Setup Instructions](#-setup-instructions)
  - [Prerequisites](#-prerequisites)
  - [Installation](#-installation)
  - [Update MCP Config](#-update-mcp-config)
  - [Running the Server](#-running-the-server)
- [Usage Guide](#-usage-guide)
  - [Creating Compositions](#-creating-compositions)
  - [Working with Layers](#-working-with-layers)
  - [Animation](#-animation)
- [Available MCP Tools](#-available-mcp-tools)
- [For Developers](#-for-developers)
  - [Project Structure](#-project-structure)
  - [Building the Project](#-building-the-project)
  - [Tests](#-tests)
  - [Smoke Test](#-smoke-test)
  - [Contributing](#-contributing)

## 📦 Features

### 🎥 Compositions & Project
- Create and list compositions
- Inspect composition settings (resolution, frame rate, duration, work area)
- Open/save projects and inspect project items

### 🧱 Layer Management
- Create text, shape, solid, null, and adjustment layers
- Reorder, rename, delete, parent, and toggle visibility
- Blending modes, track mattes, masks, and layer duplication

### 🌀 Animation & Properties
- Set keyframes with easing
- Add/remove expressions
- Read/write property values via canonical property paths
- Inspect property trees and metadata

### 🎨 Effects & Rendering
- Apply effects by display name or matchName
- Read/modify/remove effect properties
- Queue and render compositions, capture frames

### 🧰 Productivity
- Batch operations in a single undo step
- Search text layers by content
- Markers, motion blur, frame blending, time remapping

## ⚙️ Setup Instructions

### 🛠 Prerequisites
- Adobe After Effects (2022 or later)
- Node.js (18+ recommended; tests use `node --test`)
- npm or yarn package manager

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bittu101200/AE-MCP.git
   cd AE-MCP
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Build the project**
   ```bash
   npm run build
   # or
   yarn build
   ```

4. **Install the After Effects panel**
   ```bash
   npm run install-bridge
   # or
   yarn install-bridge
   ```
   This will copy the necessary scripts to your After Effects installation.

5. **Allow scripts to access files/network**
   - In After Effects, enable: Preferences → Scripting & Expressions → “Allow Scripts to Write Files and Access Network”

### 🔧 Update MCP Config

Point your MCP client to the built server entry (`build/index.js`):

Mac/Linux:
```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["/path/to/AE-MCP/build/index.js"]
    }
  }
}
```

Windows:
```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["C:\\\\path\\\\to\\\\AE-MCP\\\\build\\\\index.js"]
      }
    }
  }
```

## 👤 Authorship & Credits

- Primary author and maintainer of AE-MCP: Bhupendra Sharma
- This repository reflects substantial original work across the MCP server, bridge workflow, documentation, testing, and automation capabilities
- Credit to `Dakkshin/after-effects-mcp` for the original base idea and early foundation that helped inspire this project direction

### ▶️ Running the Server

1. **Start the MCP server**
   ```bash
   npm start
   # or
   yarn start
   ```

2. **Open After Effects**

3. **Open the MCP Bridge Auto panel**
   - In After Effects, go to Window > mcp-bridge-auto.jsx
   - The panel will automatically check for commands every few seconds
   - Make sure the "Auto-run commands" checkbox is enabled
   - The bridge reads commands/results from `~/Documents/ae-mcp-bridge`

## 🚀 Usage Guide

Once the server is running and the MCP Bridge panel is open in After Effects, AI assistants and custom applications can send structured commands directly into your After Effects workflow.

### 📘 Creating Compositions

You can create new compositions with custom settings such as:
- Name
- Width and height (in pixels)
- Frame rate
- Duration
- Background color
Example MCP tool usage:
```javascript
create-composition({
  name: "My Composition",
  width: 1920,
  height: 1080,
  frameRate: 30,
  duration: 10
});
```

### ✍️ Working with Layers

You can create and modify different kinds of layers:

**Text layers:**
- Set text content, font, size, and color
- Position text anywhere in the composition
- Adjust timing and opacity

**Shape layers:**
- Create rectangles, ellipses, polygons, and stars
- Set fill and stroke colors
- Customize size and position

**Solid layers:**
- Create background colors
- Make adjustment layers for effects

### 🕹 Animation

You can automate animation workflows with:

**Keyframes:**
- Set property values at specific times
- Create motion, scaling, rotation, and opacity changes
- Control the timing of animations

**Expressions:**
- Apply JavaScript expressions to properties
- Create dynamic, procedural animations
- Connect property values to each other

## 🛠 Available MCP Tools

Public naming convention is **kebab-case** (recommended). Legacy camelCase names remain available for backward compatibility.

### Core
- `create-composition`, `list-compositions` (resource)
- `run-script`, `run-bridge-test`
- `get-results`, `bridge-health`, `get-help`
- `execute-batch`

### Layer Management
- `move-layer`, `rename-layer`, `set-layer-visibility`, `delete-layer`
- `create-null-object`, `create-adjustment-layer`, `duplicate-layer`
- `set-blending-mode`, `set-layer-parent`, `add-mask`, `set-track-matte`

### Animation & Properties
- `set-layer-keyframe`, `get-keyframes`, `remove-keyframe`
- `set-layer-expression`, `get-expression`
- `getLayerInfo` (enhanced layer inspection; camelCase only)
- `inspect-property-tree`, `get-property-metadata`, `get-property-value`, `set-property-value`

### Effects
- `apply-effect`, `apply-effect-template`, `get-effects-help`
- `get-layer-effects`, `get-effect-properties`, `set-effect-property`, `remove-effect`

### Project & Assets
- `list-project-items`, `get-project-item-info`, `get-composition-settings`
- `import-file`, `import-from-url`, `add-layer-from-item`, `precompose-layers`
- `open-project`, `save-project`, `get-active-comp`

### Rendering & Output
- `add-to-render-queue`, `start-render`, `render-composition`, `capture-frame`

### Text, Search, Markers, QoL
- `set-text-properties`, `get-text-properties`, `search-text-layers`
- `add-marker`, `get-markers`, `remove-marker`
- `set-time-remapping`, `set-motion-blur`, `set-frame-blending`

Notes:
- Property tools use canonical property paths and normalized envelopes.
- After updating `mcp-bridge-auto.jsx`, reinstall/reopen the panel before testing changes.

## 👨‍💻 For Developers

### 🧩 Project Structure

- `src/index.ts`: MCP server implementation
- `src/bridge/*`: Bridge payload normalization and schemas
- `src/contracts/*`: Property path normalization and response contracts
- `src/scripts/mcp-bridge-auto.jsx`: Main After Effects panel script
- `install-bridge.js`: Script to install the panel in After Effects

### 📦 Building the Project

```bash
npm run build
# or
yarn build
```
### ✅ Tests

```bash
npm test
```

### 🔍 Smoke Test

```bash
node test-tools.js
```

### 🤝 Contributing

Contributions are welcome. If you want to improve AE-MCP, open an issue or submit a pull request with a focused change.
