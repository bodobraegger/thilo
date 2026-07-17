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
   - [x] Evaluierung von Mobile App Optionen (z.B. React Native, Flutter) für zukünftige Entwicklung - siehe [docs/MOBILE-APP-EVALUATION.md](./docs/MOBILE-APP-EVALUATION.md)
- [x] Erste AI Quiz Tests
   - [x] Recherche und Test-Integration von generierten Q&As
- [x] Bug Triage & Fixes
   - [x] Behandlung neuer Bugs und kleinerer Anpassungen

## Architecture & Code Quality

- [x] **Unify data fetching** — `fetchAllSections()` now calls `getSections()` internally, so there is a single fetch path, cache, and `BACKEND_URL` handling in `src/utils/data.ts`.

- [x] **Replace `is:inline` + init-guard pattern** — `Header.astro`, `TableOfContents.astro`, and `Search.astro` now use `AbortController`: each `setup()` aborts the previous controller and re-registers listeners on `astro:page-load`.

- [x] **Split oversized components** — Pure search utilities live in `src/utils/search.ts`, language switching in `src/utils/languageSwitcher.ts`, markdown rendering in `src/utils/markdown.ts`, URL building in `src/utils/urls.ts`. `TableOfContents.astro` keeps its sidebar logic in one script but it is now scoped, documented, and torn down cleanly.

- [x] **Complete i18n coverage** — `Zielgruppe` (`section.targetGroup`), the language label (`header.language`), and the scroll-to-top `aria-label` (`section.backToTop`) all come from `src/i18n/`; 404, imprint error, and PWA prompt strings were added for de/fr/it.

## UX & Visual

- [x] **Search dropdown excerpt** — Dropdown results show a highlighted 1-2 line excerpt (`getExcerpt` + `highlightHtml` in `src/utils/search.ts`).

- [x] **Sidebar animation on mobile** — Slide-in keyframe on `.sidebar-open` plus overlay fade, both behind `prefers-reduced-motion: no-preference`.

- [x] **Breadcrumb / location indicator** — Section pages render a `Home › Section` breadcrumb above the title; the current chapter is tracked live in the sidebar.

- [x] **Scroll-to-top button** — `aria-label` translated via `section.backToTop`; button floats above content with z-50.

- [x] **Print styles** — `src/styles/print.css` hides chrome and formats content for printing.

## Functionality

- [x] **Offline / PWA improvement** — Workbox `globPatterns` precaches built HTML (plus JS/CSS/fonts/icons); API responses stay StaleWhileRevalidate. Content updates are picked up via hourly and on-focus service worker update checks with a localized update prompt.
