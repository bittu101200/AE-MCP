# 🎬 After Effects MCP Server

![Node.js](https://img.shields.io/badge/node-%3E=18.x-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-success)
![License](https://img.shields.io/github/license/Dakkshin/after-effects-mcp)
![Platform](https://img.shields.io/badge/platform-after%20effects-blue)

✨ A Model Context Protocol (MCP) server for Adobe After Effects that enables AI assistants and other applications to control After Effects through a standardized protocol.

<a href="https://glama.ai/mcp/servers/@Dakkshin/after-effects-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Dakkshin/after-effects-mcp/badge" alt="mcp-after-effects MCP server" />
</a>

## Table of Contents
- [Features](#features)
  - [Compositions & Project](#compositions--project)
  - [Layer Management](#layer-management)
  - [Animation & Properties](#animation--properties)
  - [Effects & Rendering](#effects--rendering)
  - [Productivity](#productivity)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Update MCP Config](#update-mcp-config)
  - [Running the Server](#running-the-server)
- [Usage Guide](#usage-guide)
  - [Creating Compositions](#creating-compositions)
  - [Working with Layers](#working-with-layers)
  - [Animation](#animation)
- [Available MCP Tools](#available-mcp-tools)
- [For Developers](#for-developers)
  - [Project Structure](#project-structure)
  - [Building the Project](#building-the-project)
  - [Tests](#tests)
  - [Smoke Test](#smoke-test)
  - [Contributing](#contributing)
- [License](#license)

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
   git clone https://github.com/Dakkshin/after-effects-mcp.git
   cd after-effects-mcp
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
      "args": ["/path/to/after-effects-mcp/build/index.js"]
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
      "args": ["C:\\\\path\\\\to\\\\after-effects-mcp\\\\build\\\\index.js"]
    }
  }
}
```

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

Once you have the server running and the MCP Bridge panel open in After Effects, you can control After Effects through the MCP protocol. This allows AI assistants or custom applications to send commands to After Effects.

### 📘 Creating Compositions

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

You can create and modify different types of layers:

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

You can animate layers with:

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

Contributions are welcome! Please feel free to submit a Pull Request.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Dakkshin/after-effects-mcp&type=date&legend=top-left)](https://www.star-history.com/#Dakkshin/after-effects-mcp&type=date&legend=top-left)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
