# Resume to portfolio

## Decisions

Audience: all creators. Input: PDF or resume text. Output: editable single-page portfolio and standalone HTML. Stack: React/Vite/Three.js. Presentation: orbital world, Ember default, with Ocean/Forest alternatives. These defaults were selected to complete the build without further questions.

## Trigger and loop

A creator imports a document, pastes resume text, starts blank or opens the clearly fictional sample. PDF.js extracts PDF text locally; deterministic rules structure the draft. No model service is connected. Repeating the loop replaces a draft only after a confirmation if there are unsaved changes.

The creator edits their identity, introduction, skills and projects; projects can be added, removed, reordered and selected in the orbital preview. Tone refinement follows local writing rules. Every generated detail stays editable; placeholders never imply credentials.

## Checkpoint

The creator reviews the full preview before sharing. Save is explicit and stores only the edited draft, not source resume text. Saving is optional. The full workflow works without an account or network AI service.

## Output

Export website downloads standalone HTML, including project content, theme and lightweight orbital interaction. It can be opened offline or renamed index.html and deployed to a static host. JSON backup can be exported and restored via the studio.

## Acceptance criteria

- Text/PDF imports populate editable fields without uploads to a server.
- Unsupported, empty, oversized, scanned, protected and invalid files show useful errors without destroying the existing draft.
- Editing updates the preview; theme and project selection are visible.
- Save followed by reload restores the draft. Clear removes saved content after confirmation.
- Export contains entered content and safe links, escapes HTML, and needs no network dependencies.
- Project list remains usable without WebGL; keyboard navigation, phone layout and reduced motion are supported.

## Deliberate boundaries

No claims of LLM inference, automatic hosting, OCR, accounts or cloud persistence. Live studio 3D and portable exported orbital presentation are different renderers. Parsing nonstandard resumes requires manual correction. Tests cover the key workflow, not every possible PDF layout or GPU.
