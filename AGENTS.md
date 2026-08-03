# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

`dangan` (档案管理系统 / Archive Management System) is a single small web app: a Node.js + Express REST API that also serves a vanilla HTML/CSS/JS frontend from `public/`. There is only one service and no external database — records persist to a flat JSON file at `data/archives.json` (both `data/` and `node_modules/` are git-ignored and auto-created on startup). See `README.md` for the API reference and field definitions.

### Where the code lives (important caveat)

The application code (`server.js`, `test.js`, `package.json`, `public/`) was originally only on a feature branch, not on `main`. This branch consolidates it so the app is runnable from the repo root. If you ever find `main` contains only the `README.md` and the Chinese `.doc/.docx` policy documents with no `package.json`, the app code has not been merged yet — the update script is written to no-op safely in that case.

### Running / testing / building

Standard commands are defined in `package.json` scripts; use them from the repo root:

- Install deps: `npm install`
- Run the app (dev mode): `npm run dev` (alias of `npm start` → `node server.js`), serves on `http://localhost:3000`. Override the port with the `PORT` env var.
- Run tests: `npm test` (runs `node test.js`, an in-process API test suite using Node's built-in `assert`/`http`; no test framework).
- Build: there is no build step — the frontend is plain static files served by Express.
- Lint: there is no linter configured (no ESLint/Prettier); there is no `lint` script.

### Non-obvious notes

- The server reads/writes `data/archives.json` synchronously on every request; there is no in-memory cache, so editing that file directly is reflected immediately (handy for resetting demo state: `echo "[]" > data/archives.json`).
- There is no hot-reload/watcher; after changing `server.js` you must restart the `node server.js` process for changes to take effect.
