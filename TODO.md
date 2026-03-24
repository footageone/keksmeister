# Keksmeister — TODO

## Phase 1: Core (MVP)

- [x] Project setup (Vite + TypeScript + package.json)
- [x] Core types and interfaces
- [x] CookieStore — read/write/clear consent cookie
- [x] ConsentManager — consent state machine with EventTarget
- [x] ScriptBlocker — MutationObserver-based script activation
- [x] i18n — German and English translations
- [x] KeksmeisterBanner — Web Component with Shadow DOM
- [x] CSS Custom Properties theming system
- [x] Demo page
- [x] README with full documentation
- [x] ServiceAdapter interface + ServiceRegistry
- [x] Built-in adapters: PostHog, Matomo, GA4, Meta Pixel, Hotjar, Mixpanel, HubSpot
- [x] Install dependencies and verify build (6.63 kB gzipped)
- [x] Unit tests for ConsentManager (21 tests)
- [x] Unit tests for CookieStore (8 tests)
- [x] Unit tests for ScriptBlocker (3 tests)
- [x] Unit tests for ServiceRegistry (8 tests)
- [x] Unit tests for PostHog adapter (6 tests)
- [x] Integration test: full consent flow with adapters (10 tests)

## CI/CD & Infrastructure

- [x] GitHub Actions: CI workflow (typecheck, test, build, bundle size check)
- [x] GitHub Actions: npm publish workflow on release/tag (with provenance)
- [ ] GitHub Actions: deploy demo page to GitHub Pages
- [ ] Conventional Commits: add commitlint + husky for commit message validation
- [x] Renovate for dependency updates
- [ ] Bundle size tracking (e.g. size-limit or bundlesize)
- [ ] Code coverage reporting

## Phase 2: Polish & Compliance

- [x] Full WCAG 2.1 AA audit (aria-labelledby, aria-describedby, aria-checked, role=switch)
- [x] Keyboard navigation: Tab cycling (focus trap) within modal, Escape to close
- [x] Screen reader support: sr-only inputs, label[for], aria-label on required toggles
- [x] "Immer aktiv" / "Always active" i18n via translations
- [x] Privacy link text i18n ("Datenschutzerklärung" / "Privacy policy")
- [x] Auto-detect browser language (attribute → document.lang → navigator.language → 'de')
- [x] Animation: respect `prefers-reduced-motion: reduce`
- [x] Print styles (hide banner)
- [x] Focus restoration after banner/modal close
- [x] Public `manager` getter for ServiceRegistry integration
- [x] Cleanup on disconnectedCallback (stop ScriptBlocker)
- [x] Consent expiry re-prompt (consentMaxAgeDays config option)
- [ ] Live screen reader testing with VoiceOver/NVDA

## Phase 3: Extended Features

- [ ] Google Consent Mode v2 — test with real gtag
- [x] Google Tag Manager dataLayer push on consent change
- [ ] Per-service consent (not just per-category)
- [ ] Cookie auto-scan: list cookies per category in the modal
- [ ] Consent history: allow user to see when they last consented
- [x] `<keksmeister-trigger>` — small floating button to re-open settings
- [ ] Additional translations: fr, es, it, nl, pl
- [ ] Opt-out mode (for non-EU visitors, CCPA style)
- [ ] Additional adapters: Plausible (localStorage flag), Segment, TikTok Pixel
- [ ] Adapter auto-detection: scan window for known globals and suggest adapters

## Phase 4: Ecosystem

- [ ] Angular wrapper (`@keksmeister/angular`)
- [ ] React wrapper (`@keksmeister/react`)
- [ ] Vue wrapper (`@keksmeister/vue`)
- [ ] Server-side consent logging middleware (Express/Fastify)
- [ ] Consent proof export (CSV/JSON for audits)
- [ ] Storybook / component playground
- [ ] npm publish as `keksmeister`
- [ ] CDN distribution via unpkg/jsdelivr

## Phase 5: Advanced

- [ ] TCF 2.2 support (only if needed for programmatic ads)
- [ ] IAB `__tcfapi` compatibility layer
- [ ] Consent Mode for additional ad platforms (TikTok, LinkedIn Insight)
- [ ] A/B testing: measure accept/reject rates
- [ ] Visual banner editor (drag & drop layout configurator)

## Research / Open Questions

- Should we support `<slot>` elements for custom banner content?
- Should the Web Component auto-register or require explicit `customElements.define()`?
  - Current: auto-registers on import. Consider a `/register` sub-export.
- Should we support a JSON config via `<script type="application/json">` inside the component?
- Evaluate Declarative Shadow DOM for SSR scenarios.
- Evaluate Constructable Stylesheets (`adoptedStyleSheets`) vs `<style>` in Shadow DOM.
