# AGENTS.md

## What this is

FluxDev is an Electron desktop app for running multiple local dev projects without opening separate terminals. It manages projects, executes commands, and provides an embedded terminal per project.

## Commands

- `npm start` - Dev mode (electron-forge start)
- `npm run package` - Package app
- `npm run make` - Generate installers
- `npm run sync:icons` - Copy Tabler SVGs from `node_modules/@tabler/icons/icons/outline/` to `public/icons/tabler/`

No lint, typecheck, or test suite exists. `npm test` is a placeholder.

## Architecture

- `main.js` - Electron main process. All IPC handlers, process spawning, persistence, Git integration. ~1900 lines, single file.
- `preload.js` - Context bridge. Exposes `window.projectsApi` and `window.terminalApi` to renderer.
- `renderer/app.js` - Frontend UI logic (vanilla JS, no framework).
- `renderer/terminal-loader.js` - Terminal UI component.
- `renderer/index.html`, `renderer/styles.css` - UI markup and styling.

No build step for renderer code - files are loaded directly. No bundler, no transpiler.

## Persistence

Projects stored via `electron-store` (file at OS userData dir, not in repo). On first run, migrates from legacy `projects.json` if found. Data never lives in the repo.

## Platform quirks

- Windows-first design. Process termination uses `taskkill /T /F` (tree kill).
- Shell defaults to `powershell.exe` with UTF-8 encoding setup.
- `USE_PTY` flag in `main.js:9` is hardcoded `false` - terminal uses plain `child_process.spawn`.

## Key patterns

- IPC is the only bridge between main and renderer. All project ops go through `ipcMain.handle` / `ipcRenderer.invoke`.
- Process map: `runningProcesses` (keyed by `projectId:timestamp`) tracks child processes.
- Environment profiles: projects can have multiple env configs with optional venv activation.
- Auto-detection scans a folder for `package.json` files, guesses commands from `scripts`, detects framework icons.

## Code style

- CommonJS (`require`/`module.exports`). No ES modules.
- Spanish UI strings and error messages throughout.
- No comments in code - keep it that way.
- No TypeScript.
