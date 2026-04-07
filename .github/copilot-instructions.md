# Copilot instructions for vocab-master

## Project snapshot
- This is a **single-page React 19 + Vite 8 app** with nearly all product logic in one file: [src/App.jsx](../src/App.jsx).
- Core domains are kept in local state: `vocabList`, `passages`, `grammarList` (no backend API for persistence).
- UI text is primarily Vietnamese; preserve this language in new user-facing copy for consistency.

## Architecture and data flow
- Navigation is state-driven (`activeTab`, `selectedWordId`, `selectedPassageId`, `selectedGrammarId`) rather than router-driven.
- Data persistence uses a small IndexedDB wrapper in [src/App.jsx](../src/App.jsx): DB `VocabMasterDB`, store `appData`, keys `vocabList` / `passages` / `grammarList`.
- Save cycle is debounced (`setTimeout(..., 500)`) inside a `useEffect`; keep new persisted state updates compatible with this pattern.
- IDs are generated from `Date.now()` (sometimes plus small offsets); many filters/review features depend on timestamp-based IDs.

## AI/TTS integration conventions
- Gemini calls are centralized in `callGemini(prompt)` and expect **strict JSON output** (`responseMimeType: application/json`) that is parsed directly.
- Prompts are written in Vietnamese and define the expected JSON schema explicitly; follow that style for new prompts.
- TTS uses `speak(text, id)` with Gemini TTS endpoint and a custom `pcmToWav()` conversion before playback.
- `apiKey` is currently read from local constant in [src/App.jsx](../src/App.jsx); do not hardcode secrets in new code.

## UI/component patterns
- The app uses Tailwind utility classes heavily; keep styling inline in JSX to match current approach.
- Two local reusable components live in [src/App.jsx](../src/App.jsx): `RichTextEditor` and `CustomMediaPlayer`.
- Rich text content is stored as HTML strings and rendered with `dangerouslySetInnerHTML`; sanitize/strip using `stripHtml()` when sending to AI/TTS.
- Attached media for passages is stored as Data URL (`FileReader.readAsDataURL`) in state/IndexedDB, not as filesystem paths.

## Developer workflows
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`
- There is currently no test framework configured; validate changes via lint + manual UI flows.

## File-level guidance
- Entry/render bootstrapping is minimal in [src/main.jsx](../src/main.jsx).
- Global CSS is in [src/index.css](../src/index.css) and includes Tailwind v4 import (`@import "tailwindcss";`).
- Keep feature edits in [src/App.jsx](../src/App.jsx) unless you are intentionally refactoring into modules.
- Avoid introducing patterns not already used (e.g., SQL/db helpers): this app is React state + IndexedDB only.
