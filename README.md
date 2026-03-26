<p align="center">
  <img src="assets/keksmeister-logo.jpg" alt="Keksmeister Logo" width="200" />
</p>

<h1 align="center">Keksmeister</h1>

<p align="center">
  <strong>Der Meister der Kekse</strong> — A modern, framework-agnostic cookie consent Web Component.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/keksmeister"><img src="https://img.shields.io/npm/v/keksmeister" alt="npm version" /></a>
  <a href="https://github.com/footageone/keksmeister/actions/workflows/ci.yml"><img src="https://github.com/footageone/keksmeister/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/footageone/keksmeister/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/keksmeister" alt="license" /></a>
  <a href="https://footageone.github.io/keksmeister/"><img src="https://img.shields.io/badge/demo-live-brightgreen" alt="demo" /></a>
</p>

**Keksmeister** is a lightweight cookie consent library built as a Web Component with Shadow DOM encapsulation. It drops into any web application — Angular, React, Vue, Svelte, or plain HTML — without style conflicts or framework dependencies.

Built for [footage.one](https://footage.one) with GDPR/DSGVO compliance as a first-class concern. [Live Demo](https://footageone.github.io/keksmeister/)

## Why another cookie consent library?

We evaluated every major open-source consent library and found that none combines all three properties we needed:

| Library | Web Component | Full GDPR Features | Modern ESM + TS |
|---------|:---:|:---:|:---:|
| [orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) | ❌ | ✅ | ✅ |
| [Porsche cookie-consent-banner](https://github.com/porscheofficial/cookie-consent-banner) | ✅ | ⚠️ partial | ✅ |
| [Klaro](https://github.com/kiprotect/klaro) | ❌ | ✅ | ❌ |
| [tarteaucitron](https://github.com/AmauriC/tarteaucitron.js) | ❌ | ✅ | ❌ |
| [c15t](https://github.com/c15t/c15t) | ❌ | ✅ | ✅ (but Next.js focused) |
| **Keksmeister** | **✅** | **✅** | **✅** |

### Inspiration

- **orestbida/cookieconsent** — Best-in-class feature set (granular consent, script blocking, revision system, Google Consent Mode). We modeled our consent engine after this library's approach.
- **Porsche cookie-consent-banner** — Proved that a StencilJS-based Web Component approach works for consent banners. We chose native Custom Elements over Stencil to eliminate the runtime dependency.
- **Klaro** — Config-driven approach with per-service consent and data-attribute script blocking. Our `data-keksmeister` attribute pattern is inspired by Klaro's design.
- **Orejime** — Accessibility-focused Klaro fork. Reminded us that a11y is non-negotiable for consent UIs.
- **c15t** — Modern developer experience and full-stack consent logging. We agree on the DX goal but keep the server-side optional (a simple callback, not a whole database).

## Features

- **Web Component** — `<keksmeister-banner>` with Shadow DOM encapsulation
- **Zero dependencies** — Vanilla TypeScript, no framework runtime
- **Tiny bundle** — Target < 8 kB gzipped
- **GDPR/DSGVO compliant** — Accept All + Reject All on first layer (equal prominence), granular categories, consent versioning
- **Script blocking** — `data-keksmeister` attribute blocks scripts until consent
- **Service adapters** — Programmatic opt-in/opt-out for PostHog, Matomo, GA4, Meta Pixel, Mixpanel, HubSpot, Plausible, TikTok Pixel
- **Auto-clear cookies** — Revoked categories' cookies are automatically removed
- **Google Consent Mode v2** — Built-in `gtag('consent', 'update', ...)` integration
- **CSS Custom Properties** — Fully themeable from outside Shadow DOM
- **i18n** — German and English built-in, extensible with custom translations
- **Accessible** — Keyboard navigation, focus management, ARIA attributes
- **Consent proof** — `onConsent` callback for server-side logging (you own the endpoint)

## Quick Start

### npm

```bash
npm install keksmeister
```

```js
import 'keksmeister';
```

```html
<keksmeister-banner
  privacy-url="/datenschutz"
  lang="de"
></keksmeister-banner>
```

### CDN / Script Tag

No build step needed. Pick your preferred CDN:

```html
<!-- jsDelivr (recommended) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/keksmeister/dist/keksmeister.min.js"></script>

<!-- or unpkg -->
<script type="module" src="https://unpkg.com/keksmeister/dist/keksmeister.min.js"></script>

<keksmeister-banner
  privacy-url="/datenschutz"
  lang="de"
></keksmeister-banner>
<keksmeister-trigger position="bottom-left"></keksmeister-trigger>
```

Pin a specific version for production:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/keksmeister@0.3.0/dist/keksmeister.min.js"></script>
```

Browse all available files: [keksmeister on jsDelivr](https://www.jsdelivr.com/package/npm/keksmeister)

### JavaScript Configuration

```js
import { KeksmeisterBanner } from 'keksmeister';

const banner = document.querySelector('keksmeister-banner');
banner.config = {
  categories: [
    { id: 'essential', label: 'Essential', required: true },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
  ],
  privacyUrl: '/datenschutz',
  lang: 'de',
  revision: '2',
  googleConsentMode: true,
  onConsent: (record) => {
    // Send consent proof to your backend
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  },
};
```

### Script Blocking

For third-party scripts loaded via `<script>` tags:

```html
<!-- This script only executes after "analytics" consent -->
<script type="text/plain" data-keksmeister="analytics" data-src="https://example.com/analytics.js"></script>

<!-- Inline scripts too -->
<script type="text/plain" data-keksmeister="marketing">
  // This runs only after marketing consent
</script>
```

### Service Adapters (Programmatic Consent)

Many modern analytics libraries (PostHog, Matomo, GA4, etc.) are initialized via JavaScript and have their own opt-in/opt-out APIs. For these, use **service adapters** instead of script blocking:

```js
import { ConsentManager, ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
import { createGoogleAnalyticsAdapter } from 'keksmeister/adapters/google-analytics';
import { createMetaPixelAdapter } from 'keksmeister/adapters/meta-pixel';

// PostHog must be initialized with opt_out_capturing_by_default: true
posthog.init('phc_...', {
  api_host: 'https://eu.i.posthog.com',
  opt_out_capturing_by_default: true,
});

// The banner's ConsentManager is exposed after config is set
const banner = document.querySelector('keksmeister-banner');
const registry = new ServiceRegistry(banner.manager);

// Register adapters — they auto-sync with consent state
registry.register(createPostHogAdapter(posthog));
registry.register(createGoogleAnalyticsAdapter());
registry.register(createMetaPixelAdapter());
```

#### Available Adapters

| Adapter | Import | Default Category |
|---------|--------|-----------------|
| PostHog | `keksmeister/adapters/posthog` | analytics |
| Matomo | `keksmeister/adapters/matomo` | analytics |
| Google Analytics 4 | `keksmeister/adapters/google-analytics` | analytics |
| Google Ads | `keksmeister/adapters/google-analytics` | marketing |
| Meta Pixel | `keksmeister/adapters/meta-pixel` | marketing |
| Mixpanel | `keksmeister/adapters/mixpanel` | analytics |
| HubSpot | `keksmeister/adapters/hubspot` | marketing |
| Plausible | `keksmeister/adapters/plausible` | analytics |
| TikTok Pixel | `keksmeister/adapters/tiktok-pixel` | marketing |

#### Adapter vs. Script Blocking — Which to use?

Not every tool has a consent API. Some must be blocked from loading entirely until consent is given. Here's a guide for common tools:

| Tool | Approach | Reason |
|------|----------|--------|
| **PostHog** | Adapter | Has `opt_in_capturing()` / `opt_out_capturing()` API |
| **Matomo** | Adapter | Has `requireConsent` / `setConsentGiven` commands |
| **Google Analytics 4** | Adapter | Google Consent Mode v2 (`gtag('consent', 'update', ...)`) |
| **Google Ads** | Adapter | Shares Google Consent Mode v2 with GA4 |
| **Meta Pixel** | Adapter | Has `fbq('consent', 'grant')` / `fbq('consent', 'revoke')` |
| **Mixpanel** | Adapter | Has `opt_in_tracking()` / `opt_out_tracking()` API |
| **HubSpot** | Adapter | Has `_hsp.push(['setHubSpotConsent', ...])` queue |
| **Plausible** | Adapter | Uses `localStorage.plausible_ignore` flag |
| **TikTok Pixel** | Adapter | Has `ttq.grantConsent()` / `ttq.revokeConsent()` |
| **Hotjar** | Script Blocking | No consent API — block the script until consent |
| **Google Tag Manager** | Script Blocking | Load GTM only after consent, or use Consent Mode |
| **Clarity (Microsoft)** | Script Blocking | No consent API — block the script until consent |
| **Intercom** | Script Blocking | No granular consent API — block until consent |
| **Crisp Chat** | Script Blocking | No consent API — block until consent |
| **YouTube Embeds** | Script Blocking | Use `data-keksmeister` on the embed script |
| **Google Maps** | Script Blocking | Block iframe/script until consent |
| **Custom Scripts** | Script Blocking | Any `<script>` without its own consent API |

**Rule of thumb:** If the tool has a JavaScript API to enable/disable tracking at runtime, use an **adapter**. If it only works by loading/not loading its script, use **script blocking** with `data-keksmeister`.

Script blocking example for Hotjar:

```html
<script type="text/plain" data-keksmeister="analytics">
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:YOUR_ID,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

#### Custom Adapters

Write your own adapter for any service:

```js
registry.register({
  id: 'my-analytics',
  category: 'analytics',
  onConsent: () => myAnalytics.enable(),
  onRevoke: () => myAnalytics.disable(),
});
```

### Theming

```css
keksmeister-banner {
  --km-primary: #0066cc;
  --km-primary-text: #ffffff;
  --km-bg: #1a1a1a;
  --km-text: #ffffff;
  --km-text-secondary: #aaaaaa;
  --km-border: #333333;
  --km-radius: 12px;
  --km-font-family: 'Inter', sans-serif;
}
```

### Re-open Settings

```html
<button onclick="document.querySelector('keksmeister-banner').openSettings()">
  Cookie-Einstellungen
</button>
```

## Headless / Core Only

Use the consent engine without the UI:

```js
import { ConsentManager, ScriptBlocker } from 'keksmeister/core';

const manager = new ConsentManager({
  categories: [
    { id: 'essential', label: 'Essential', required: true },
    { id: 'analytics', label: 'Analytics' },
  ],
  privacyUrl: '/privacy',
});

const blocker = new ScriptBlocker(manager);
blocker.start();

// Programmatic consent
manager.acceptAll();
manager.isAccepted('analytics'); // true
```

## Architecture

```
src/
├── core/                      # Headless consent engine (no UI)
│   ├── consent-manager.ts     # Consent state machine + EventTarget
│   ├── cookie-store.ts        # Cookie read/write with base64 encoding
│   ├── script-blocker.ts      # MutationObserver-based script activation
│   ├── service-adapter.ts     # ServiceAdapter interface + ServiceRegistry
│   └── types.ts               # All TypeScript interfaces
│
├── adapters/                  # Built-in service adapters
│   ├── posthog.ts             # PostHog opt-in/opt-out
│   ├── matomo.ts              # Matomo requireConsent/setCookieConsentGiven
│   ├── google-analytics.ts    # GA4 Consent Mode v2 (analytics + ads)
│   ├── meta-pixel.ts          # Meta Pixel consent grant/revoke
│   ├── mixpanel.ts            # Mixpanel opt-in/opt-out tracking
│   ├── hubspot.ts             # HubSpot setHubSpotConsent
│   ├── plausible.ts           # Plausible localStorage flag
│   └── tiktok-pixel.ts        # TikTok Pixel grantConsent/revokeConsent
│
├── ui/                        # Web Component layer
│   ├── keksmeister-banner.ts  # <keksmeister-banner> Custom Element
│   └── styles.ts              # Shadow DOM CSS with Custom Properties
│
└── i18n/                      # Translations
    ├── de.ts                  # German (default)
    └── en.ts                  # English
```

### Design Decisions

- **Native Custom Elements over Stencil/Lit** — Zero runtime overhead. The component is simple enough that a framework adds complexity without proportional benefit.
- **Shadow DOM** — Guarantees style encapsulation. The banner looks the same in every host application.
- **CSS Custom Properties** — The only styling API that crosses the Shadow DOM boundary. All visual aspects are customizable without `::part()` or `::slotted()`.
- **Core/UI split** — The consent engine (`ConsentManager`) is usable headless. Build your own UI if needed.
- **No built-in server/database** — Unlike c15t, we believe consent proof logging belongs in your existing backend. A simple `onConsent` callback keeps the library focused.
- **`data-keksmeister` attribute** — Simple, declarative script blocking inspired by Klaro's `data-name` approach.
- **Two consent mechanisms** — Script blocking for `<script>` tags, service adapters for programmatic APIs (PostHog, GA4, etc.). Most real-world setups need both.
- **Adapter pattern** — A simple `{ onConsent, onRevoke }` interface. Built-in adapters for 9 popular services, easy to extend with custom adapters. Tools without a consent API (Hotjar, Clarity, etc.) should use script blocking instead.

## Browser Support

- Chrome 67+
- Firefox 63+
- Safari 13.1+
- Edge 79+

(All browsers with Custom Elements v1 + Shadow DOM v1 support)

## License

MIT — [footage.one](https://footage.one)
