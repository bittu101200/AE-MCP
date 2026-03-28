# AGENTS.md
Guidance for coding agents working in `after-effects-mcp`.
This repository is a TypeScript MCP server that controls Adobe After Effects via ExtendScript bridge scripts.

## 1) Project Overview
- Runtime: Node.js + TypeScript, ESM (`"type": "module"`)
- Main source entry: `src/index.ts`
- Build output: `build/index.js`
- AE scripts: `src/scripts/*.jsx`
- Bridge script: `src/scripts/mcp-bridge-auto.jsx`
- Package manager: npm (`package-lock.json` present)
- TypeScript mode: `strict: true` (`tsconfig.json`)

## 2) Repository Layout
- `src/index.ts`: MCP server tools/resources/prompts and AE bridge command queueing
- `src/scripts/*.jsx`: ExtendScript commands run inside After Effects
- `build/`: generated JS + copied JSX scripts (do not hand-edit)
- `install-bridge.js`: installs bridge panel into AE ScriptUI Panels folder
- `test-tools.js`: smoke test client that starts built server and lists tools

## 3) Setup Commands
- Install dependencies: `npm install`
- Note: `postinstall` automatically runs `npm run build`
- Compile and copy scripts: `npm run build`
- Start MCP server from build output: `npm start`
- Install bridge panel into AE: `npm run install-bridge`
- Optional demo script: `npm run showcase`

## 4) Build / Lint / Test Commands
### Build
- Primary build command: `npm run build`
- Build pipeline:
  - `tsc`
  - `copyfiles -u 1 "src/scripts/**/*" build`

### Lint / Format / Typecheck
- No ESLint script is configured.
- No Prettier script is configured.
- Canonical typecheck gate is compile: `npm run build`
- If lint/format tooling is added, add commands to this file.

### Tests
- No `npm test` script is configured right now.
- Existing smoke test command: `node test-tools.js`
- Recommended local verification sequence:
  1. `npm run build`
  2. `node test-tools.js`

### Running a Single Test (Important)
- There is no formal test runner currently, so no true built-in single-test command exists.
- Closest targeted check in current repo: `node test-tools.js`
- If a Node test suite is added later, use these patterns:
  - Single file: `node --test path/to/file.test.js`
  - Single test name: `node --test path/to/file.test.js --test-name-pattern "case name"`

## 5) Agent Workflow Expectations
- After TypeScript edits, run: `npm run build`
- After bridge/JSX edits, run: `npm run build`
- For smoke behavior check, run: `node test-tools.js`
- Do not hand-edit files in `build/`; regenerate through scripts
- Keep changes focused; avoid broad refactors unless asked

## 6) Code Style Guidelines (TypeScript)
### Imports and Modules
- Use ESM import/export syntax only.
- Keep imports at top of file.
- Prefer stable grouping:
  1. External packages
  2. Node built-ins
  3. Local modules
- Use explicit `.js` extension for local ESM imports when runtime requires it.

### Formatting
- Follow local style in the touched file.
- `src/index.ts` currently uses semicolons and mostly double quotes; stay consistent nearby.
- Do not mass-reformat unrelated files.
- Keep lines readable; split long arrays/objects when editing nearby code.

### Types and Schemas
- Preserve strict typing compatibility (`strict: true`).
- Prefer explicit return types for shared/non-trivial helpers.
- Keep `any` at boundaries only; narrow aggressively in core logic.
- Use Zod for tool input contracts.
- Reuse shared schema fragments (`CompIdentifierSchema`, `LayerIdentifierSchema`) rather than duplicating fields.
- Prefer constrained values (`z.enum`, literal unions, `as const`) over free-form strings.

### Naming Conventions
- `camelCase`: variables, functions, parameters
- `PascalCase`: type-like constructs and schema constants
- `UPPER_SNAKE_CASE`: true constants (paths, immutable registries)
- Keep MCP tool names stable, descriptive, and action-oriented.

### Error Handling
- Wrap filesystem and bridge interactions in `try/catch`.
- Return structured MCP tool errors with `isError: true`.
- Include actionable context in messages (what failed and which command/input).
- Avoid uncaught throws from MCP tool handlers.
- Keep timeouts explicit; increase only for known long operations.

### MCP Tool Patterns
- Prefer shared `queueAndWait` for AE command execution.
- Clear stale result file before submitting a new command.
- Include command IDs for robust request/response matching.
- Preserve dual lookup behavior (`compIndex`/`compName`, `layerIndex`/`layerName`) for new tools.

## 7) Code Style Guidelines (ExtendScript / JSX)
### Language Constraints
- Use ExtendScript-compatible syntax (legacy JS).
- Prefer `var` in `.jsx` files for compatibility.
- Avoid modern JS features unsupported by AE's scripting engine.

### Structure and Behavior
- Keep function boundaries clear; one command function per operation.
- Reuse shared resolvers (`resolveComp`, `resolveLayer`) where possible.
- Preserve AE's 1-based indexing assumptions.
- Return JSON string payloads with consistent `status` and `message` fields.
- Keep command names aligned with TypeScript-side dispatch.

### Error Handling in JSX
- Wrap command bodies in `try/catch`.
- Return structured JSON errors instead of raw throws.
- Include useful identifiers in error text (comp/layer/property).

## 8) Conventions for Safe Changes
- Do not switch module system away from ESM.
- Do not rename MCP tools without updating all dispatch and call sites.
- Do not manually rewrite generated `build/` output.
- Avoid adding dependencies that raise runtime requirements unless documented.

## 9) Cursor and Copilot Rules Status
Checked in this repository:
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present
No additional Cursor/Copilot instruction files are currently applied.

## 10) Quick Command Reference
- `npm install` - install dependencies and trigger postinstall build
- `npm run build` - compile TypeScript and copy JSX scripts
- `npm start` - run built MCP server (`build/index.js`)
- `npm run install-bridge` - install AE ScriptUI bridge panel
- `node test-tools.js` - smoke test by listing MCP tools

## 11) If You Add Tooling Later
When introducing linting or a real test framework, update this file immediately with:
- Full suite command
- Single-file test command
- Single-test-name command
- Expected local verification sequence
