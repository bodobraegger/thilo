- [x] Research, Rewrite & Code Maintainability
   - [x] Recherche und Rewrite in geeignetem Framework
   - [x] Verbesserung der Code-Struktur zur langfristigen Wartbarkeit
   - [x] Vorbereitung für zukünftige Erweiterungen (z.B. PWA, AI-Integration)
- [x] Tailwind Migration
   - [x] Refactoring des Design Frameworks von Primer Design zu Tailwind für bessere Wartbarkeit und Performance
- [x] Google Indexing Review
   - [x] Überprüfung und Optimierung für Google-Indexierung und AI-Search-Integration
- [x] PWA & Mobile App Groundwork
   - [x] Vorarbeiten für Progressive Web App Integration (Service Worker Setup, Manifest)
   - [x] Evaluierung von Mobile App Optionen (z.B. React Native, Flutter) für zukünftige Entwicklung
- [x] Erste AI Quiz Tests
   - [x] Recherche und Test-Integration von generierten Q&As
- [x] Bug Triage & Fixes
   - [x] Behandlung neuer Bugs und kleinerer Anpassungen

## Architecture & Code Quality

- [ ] **Unify data fetching** — `src/utils/data.ts` and `src/utils/sectionMappings.ts` both fetch sections from Strapi independently with different caches (1 hr vs 1 min) and different API URL handling (`sectionMappings.ts` hardcodes `https://api.thilo.scouts.ch/` instead of using `BACKEND_URL`). Merge into one module: have `fetchAllSections()` call `getSections()` internally and build mappings from that result.

- [ ] **Replace `is:inline` + init-guard pattern** — `Header.astro` and `TableOfContents.astro` both use `window.__headerInit` / `window.__tocInit` guards to prevent listener duplication across Astro ViewTransitions. This is fragile. Better approach: use `document.addEventListener('astro:before-swap', cleanup)` with `AbortController` to tear down listeners cleanly before each transition, then re-add on `astro:page-load`.

- [ ] **Split oversized components** — Three components carry too many responsibilities:
  - `Search.astro` (514 lines): relevance scoring + highlight logic + dropdown render + full-page render — extract the pure JS utilities (relevance, highlight, excerpt) into `src/utils/search.ts` so they're testable and reusable
  - `TableOfContents.astro` (420 lines): sidebar toggle, scroll sync, active link tracking, chapter toggle — extract sidebar open/close logic into a separate script or utility
  - `Header.astro` (374 lines): search embed, language switcher, menu dropdown, theme toggle — extract language-switching logic into `src/utils/languageSwitcher.ts`

- [ ] **Complete i18n coverage** — Several hardcoded strings remain:
  - `src/components/Section.astro`: `"Zielgruppe"` label not translated
  - `src/components/Header.astro`: `"Language"` label hardcoded in English
  - `src/components/Section.astro`: scroll-to-top `aria-label="Nach oben"` is German-only

## UX & Visual

- [ ] **Search dropdown excerpt** — The header dropdown shows only result title + section badge. The full search page shows a content excerpt. Add a short excerpt (1–2 lines) to dropdown results so users can see why something matched without navigating away.

- [ ] **Sidebar animation on mobile** — The mobile sidebar appears/disappears instantly (display toggle). Add a CSS slide-in transition (translate + opacity) for a smoother feel.

- [ ] **Breadcrumb / location indicator** — On section pages, there is no visual indicator of where you are in the hierarchy beyond the sidebar highlight. Add a simple `Section > Chapter` breadcrumb at the top of the content area.

- [ ] **Scroll-to-top button** — Exists in `Section.astro` but aria-label is untranslated. Fix aria-label and ensure button is visible enough on mobile (currently might be hidden behind content).

- [ ] **Print styles** — No `@media print` styles. Adding basic print CSS (hide header/sidebar/search, full-width content, legible font size) would help users printing scout guides.

## Functionality

- [ ] **Offline / PWA improvement** — Service worker is set up via `@vite-pwa/astro` but API responses are cached with StaleWhileRevalidate. Consider also precaching section HTML pages so the app is fully usable offline after first visit.
