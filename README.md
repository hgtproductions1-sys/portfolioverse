# PortfolioVerse

**Your work, in orbit.** A local-first portfolio builder for creators, built with React, Vite, Three.js and PDF.js.

## What works

- Import a text-based PDF, TXT/Markdown file, or pasted resume; start from a fictional sample or blank draft.
- Extract name, role, email, summary, skills and projects into an editable draft.
- Edit identity and projects; add, remove and reorder projects.
- Explore a draggable, selectable Three.js orbital world with an accessible project list.
- Choose Ember, Ocean or Forest and apply deterministic writing-tone refinements.
- Explicitly save a draft to browser storage, restore on reload, or clear it.
- Export/restore a JSON backup and download a self-contained portfolio HTML website.

**Important:** This release uses local, rule-based extraction and rewriting, not an LLM. No AI API is called and no API key is needed. The AI-powered title is the product direction, not a claim that this build has model inference. Resume layouts vary: review all extracted content before exporting. No credentials, achievements or project outcomes are invented.

## Setup and run

Use Node **24.20.0**, pinned in `.nvmrc`, and npm. From this project directory:

```sh
nvm install
nvm use
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173` (or the URL Vite prints if that port is occupied). No global npm packages, accounts, database, external fonts, or environment variables are required. Runtime dependencies and the lockfile are pinned. With Node already installed, omit the two `nvm` commands.

## Try the full workflow

1. Select **Explore a sample** for an immediate fictional demo, or import your own resume.
2. Edit **Your story**. Under **Projects**, add and reorder your work.
3. Choose an atmosphere under **Look & feel**. Drag the universe or select a project from its list.
4. **Save draft** only if you want it stored on this browser. Resume source text is not saved.
5. Open the full preview, then **Export website**. Open the downloaded HTML directly, even offline.
6. For deployment, rename the downloaded file to `index.html` and upload it to a static host.

The studio uses Three.js; exported portfolios deliberately use lightweight CSS perspective and orbital interaction with no external dependencies. Their animation differs from the studio's WebGL preview. Both include readable project content and reduced-motion support.

## Test

The single offline test command is:

```sh
npm test
```

`make test` is an equivalent alias on machines with Make. The unit suite requires no network, browser or installed npm dependencies; it uses Node's built-in test runner. It covers parsing, placeholders, refinement, file limits, URL sanitization, email escaping and export injection protection.

For browser integration tests, after `npm ci`:

```sh
npx playwright install chromium
npm run test:e2e
```

On Linux, Playwright system packages may be required for browser tests. A browser-testing container is provided below so no host-level package installation is necessary. With an existing Microsoft Edge installation, use `PW_CHANNEL=msedge npm run test:e2e` in a POSIX shell. Browser tests cover text/PDF uploads, invalid PDFs, editing, storage restore, HTML download, mobile overflow, keyboard tabs and themes.

## Build and deploy the builder

```sh
npm run build
npx vite preview --host 127.0.0.1
```

Deploy the complete `dist/` directory to any static host. Keep the PDF worker asset alongside the other build assets. There are no backend routes. Large Three.js/PDF.js chunks can produce a non-fatal Vite bundle-size warning.

## Docker — clean Linux rebuild

```sh
docker build -t portfolioverse .
docker run --rm -p 8080:80 portfolioverse
```

Open `http://localhost:8080`. The multi-stage Dockerfile installs dependencies from the lockfile, runs the offline tests, builds, and serves static files with Nginx. Runtime and base images are version-pinned. Building the image requires network access to obtain base images and npm dependencies; running the built app does not require third-party services.

Browser tests in a reproducible Linux container:

```sh
docker build -f Dockerfile.e2e -t portfolioverse-e2e .
docker run --rm portfolioverse-e2e
```

## Data and security

Files remain in memory on the device. Only **Save draft** writes the edited draft to localStorage. Shared-computer users should clear their draft afterward. Exports/backups contain personal information: review before sharing. PDFs are limited to 8 MB and 30 pages; scanned/image-only and encrypted PDFs require a text alternative. No OCR is included. Source documents are never uploaded. User text is escaped on export; project links accept only credential-free absolute HTTP(S) URLs.

## Verification and boundaries

Validated on the development machine: offline unit tests, real Edge browser integration tests, production build. Docker is not installed on the development machine, so neither Linux image has been run here. Hosted publishing, authentication, cloud storage and LLM generation are not implemented. Export provides a working deployment artifact, not automatic hosting.

See `workflows/resume-to-portfolio.md` for the implemented workflow and acceptance criteria.
