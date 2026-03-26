# Keksmeister

A cookie consent Web Component library for footage.one.

## Project

- **Language:** TypeScript (strict mode)
- **Package Manager:** bun
- **Build:** Vite 6 in library mode
- **Test:** Vitest with happy-dom
- **Output:** ESM (`keksmeister.js`) + UMD (`keksmeister.umd.cjs`)
- **Target:** ES2022, no polyfills

## Architecture

The library has a strict core/ui split:

- `src/core/` — Headless consent engine. No DOM rendering. Can be used standalone.
  - `ConsentManager` — State machine, cookie persistence, events
  - `ScriptBlocker` — Blocks/activates `<script data-keksmeister="...">` tags
  - `ServiceRegistry` + `ServiceAdapter` — Programmatic opt-in/opt-out for JS-based services
- `src/adapters/` — Built-in service adapters (PostHog, Matomo, GA4, Meta Pixel, Mixpanel, HubSpot, Plausible, TikTok Pixel). Each adapter implements the `ServiceAdapter` interface.
- `src/ui/` — Web Component (`<keksmeister-banner>`) using native Custom Elements + Shadow DOM.
- `src/i18n/` — Translation files. German is the default fallback.

Two consent mechanisms coexist:
1. **Script blocking** — For `<script>` tags that should not load before consent
2. **Service adapters** — For libraries already loaded that have their own opt-in/opt-out APIs

## Git Workflow

- **Never push directly to `main`.** All features and bugfixes must go through a pull request.
- Create a feature branch, commit there, push, and open a PR via `gh pr create`.
- Branch naming: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`
- Direct pushes to `main` are only acceptable for version bumps before `gh release create`.

## Git Conventions

- **Conventional Commits**: All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- Format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`
- Scopes: `core`, `ui`, `adapters`, `i18n`, `demo`, or omit for project-wide changes
- Examples:
  - `feat(core): add consent versioning with revision tracking`
  - `feat(adapters): add PostHog opt-in/opt-out adapter`
  - `fix(ui): prevent modal close when clicking inside modal content`
  - `docs: update README with service adapter examples`
  - `ci: add GitHub Actions build and test workflow`

## Conventions

- No framework dependencies (no React, no Lit, no Stencil)
- All UI rendering uses programmatic DOM construction (createElement), never innerHTML
- All CSS uses Custom Properties prefixed with `--km-`
- All custom events use the `keksmeister:` prefix
- Data attributes use `data-keksmeister`
- Cookie name default: `keksmeister_consent`
- Service adapter factory functions follow `create<Service>Adapter()` naming
- Adapters use minimal interfaces (e.g. `PostHogLike`) to avoid importing third-party types
- Repository: https://github.com/footageone/keksmeister

## Commands

```sh
bun run dev        # Dev server with demo page
bun run build      # Production build
bun run test       # Run tests
bun run typecheck  # TypeScript check
```

## Publishing / Releases

**Never publish manually with `npm publish`.** Use `gh release create` instead:

```sh
# Bump version in package.json first, then:
gh release create v0.2.0 --generate-notes
```

This triggers the `publish.yml` GitHub Actions workflow which:
1. Builds the library
2. Runs tests
3. Publishes to npm with provenance (via OIDC Trusted Publishers, no token needed)

The npm package uses Trusted Publishers — authentication happens automatically via GitHub's OIDC token.
