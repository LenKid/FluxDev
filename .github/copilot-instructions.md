# Project Guidelines

## Code Style
- Keep Node-side files in CommonJS (`require`, `module.exports`) to match current project setup.
- Preserve the current process split: Electron main logic in `main.js`, preload bridge in `preload.js`, UI DOM logic in `renderer/app.js`.
- Keep changes small and focused; avoid broad refactors unless explicitly requested.

## Architecture
- This project is a single-window Electron app.
- `main.js` owns app lifecycle and `BrowserWindow` creation.
- `preload.js` is the only bridge between renderer and Electron/Node APIs via `contextBridge`.
- `renderer/app.js` should only use APIs exposed by preload and browser DOM APIs.
- Respect the CSP defined in `renderer/index.html`; do not introduce external scripts/styles without updating CSP intentionally.

## Build And Test
- Install dependencies: `npm install`
- Start development app: `npm start`
- Package app: `npm run package`
- Build distributables: `npm run make`
- Note: current `npm test` script is a placeholder (`dev`) and is not a valid test command.

## Conventions
- Prefer adding new Electron capabilities through explicit preload APIs, not direct renderer access.
- If adding IPC, define clear channel names and keep validation in main/preload boundaries.
- Keep security defaults (`contextBridge` usage and strict CSP) unless a task explicitly requires changes.
- Debug config in `.vscode/launch.json` currently references another workspace path; verify or update it before relying on F5 debugging.

## Documentation
- Product intent, roadmap, and visual direction are documented in `README.md`.
- Use README as the source of truth for high-level product context; keep these instructions focused on coding behavior.