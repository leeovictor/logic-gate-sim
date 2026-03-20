# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based circuit logic simulator built with TypeScript and Vite. The app renders on an HTML5 Canvas element that fills the full browser viewport.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build (outputs to `dist/`)
- `npm run test` — run all tests once (`vitest run`)
- `npm run test:watch` — run tests in watch mode (`vitest`)
- `npx vitest run src/path/to/file.test.ts` — run a single test file

## Architecture

- **Entry point:** `index.html` loads `src/main.ts` as an ES module
- **Rendering:** Full-viewport `<canvas>` with 2D context, auto-resizes on window resize
- **Build tool:** Vite 8 with TypeScript (ES2020 target, ESNext modules, bundler resolution)
- **Testing:** Vitest 4 — test files use `*.test.ts` convention and are excluded from `tsconfig.json` compilation
