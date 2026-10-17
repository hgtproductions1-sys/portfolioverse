# PortfolioVerse

**PortfolioVerse — An AI-Powered 3D Portfolio Builder** turns a resume into an immersive portfolio world. The buildathon MVP focuses on the loop: **upload → generate → refine → publish**.

## MVP decisions

- Audience: all creators
- Input: resume or PDF upload
- Output: one polished portfolio landing page
- 3D direction: orbital project world
- AI output: structured portfolio draft
- Privacy: local demo data only
- Stack: React, Vite, and Three.js

The current slice is a visual foundation for the resume-to-3D transformation. The next implementation step is replacing the demo CTA with local file parsing and a structured draft state.

## Setup

Requirements: Node.js 22 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Checks

```bash
make test
make build
```

The test command is intentionally offline and currently validates the Node test runner can execute the project test suite. Add behavior tests alongside each new generator workflow.

## Docker

```bash
docker build -t portfolioverse .
docker run --rm -p 8080:80 portfolioverse
```

Open `http://localhost:8080`.

## Deploy

Build the static `dist/` output with `npm run build`, then deploy that directory to any static host. Keep AI credentials server-side when the generation API is added; never put secrets in `VITE_*` variables.
