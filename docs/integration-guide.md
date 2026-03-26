# Integration Guide

## How Keksmeister works

Keksmeister provides two Web Components that work together:

- **`<keksmeister-banner>`** — The consent banner and settings modal
- **`<keksmeister-trigger>`** — A button to re-open cookie settings

Both are **standard Custom Elements**. They register themselves automatically when you import `keksmeister`. You place them in your HTML once — they manage their own visibility internally.

### Key principle: Declare, don't manage

The most important thing to understand:

> **Do NOT create, remove, show, or hide these elements programmatically.**
> Place them in your HTML and leave them there. They handle everything internally.

The banner decides on its own when to show:
- **First visit (no consent cookie):** Banner is visible
- **After consent:** Banner hides itself
- **Consent expired or revision changed:** Banner reappears

The trigger is always in the DOM but only useful after consent (to re-open settings).

### How banner and trigger connect

The trigger finds the banner via a CSS selector (default: `"keksmeister-banner"`). When clicked, it calls `banner.openSettings()`. That's the entire connection — no shared state, no event bus, no service injection.

```
User clicks trigger → trigger.openSettings() → banner shows modal
User saves choice   → banner hides itself     → cookie is written
```

## Minimal setup

```html
<!-- Place both elements once, anywhere in your page -->
<keksmeister-banner
  privacy-url="/datenschutz"
  lang="de"
></keksmeister-banner>

<keksmeister-trigger position="bottom-left"></keksmeister-trigger>
```

```js
// One import registers both Custom Elements
import 'keksmeister';
```

That's it. No further wiring needed.

## Configuration

### Via HTML attributes (simple)

```html
<keksmeister-banner
  privacy-url="/datenschutz"
  lang="de"
  categories='["analytics", "marketing"]'
  revision="2"
></keksmeister-banner>
```

### Via JavaScript (full control)

```js
const banner = document.querySelector('keksmeister-banner');
banner.config = {
  categories: [
    { id: 'essential', label: 'Notwendig', required: true },
    { id: 'analytics', label: 'Statistiken' },
    { id: 'marketing', label: 'Marketing' },
  ],
  privacyUrl: '/datenschutz',
  lang: 'de',
  onConsent: (record) => {
    // Send consent proof to your server
    fetch('/api/consent', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },
};
```

## Events

| Event | When | Detail |
|-------|------|--------|
| `keksmeister:consent` | User accepts (all or custom) | `ConsentRecord` |
| `keksmeister:revoke` | User rejects or revokes | `ConsentChoices` |
| `keksmeister:open` | Banner or modal becomes visible | — |
| `keksmeister:close` | Banner hides after user action | — |

Listen on the banner element:

```js
const banner = document.querySelector('keksmeister-banner');
banner.addEventListener('keksmeister:consent', (e) => {
  console.log('Consent given:', e.detail);
});
```

## Service adapters

For tools with a JavaScript consent API, use adapters instead of script blocking:

```js
import { ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';

const banner = document.querySelector('keksmeister-banner');
const registry = new ServiceRegistry(banner.manager);
registry.register(createPostHogAdapter(posthog));
```

The registry listens for consent/revoke events automatically. No manual wiring needed.

## Trigger variants

### Icon (default)

Fixed-position floating button in a corner of the page:

```html
<keksmeister-trigger></keksmeister-trigger>
<keksmeister-trigger position="bottom-right"></keksmeister-trigger>
```

### Text

Inline button with localized label, ideal for footers or privacy pages:

```html
<keksmeister-trigger variant="text"></keksmeister-trigger>
<keksmeister-trigger variant="text" label="Cookies verwalten"></keksmeister-trigger>
```

The label is auto-localized based on the page language.

### Slotted content (fully custom)

When you place content inside the element, it renders a minimal, unstyled button wrapper around your content via `<slot>`. You have full control over the appearance:

```html
<!-- Link-style trigger -->
<keksmeister-trigger>
  <a href="#">Cookie-Einstellungen anpassen</a>
</keksmeister-trigger>

<!-- Custom styled trigger -->
<keksmeister-trigger>
  <span class="my-cookie-btn">⚙️ Cookies</span>
</keksmeister-trigger>
```

The wrapper button is fully transparent (no background, no border, no padding). It only provides the click handler and an `aria-label` for accessibility. Your slotted content controls the entire visual appearance.

## Theming

All visual aspects are customizable via CSS Custom Properties:

```css
keksmeister-banner {
  --km-primary: #2563eb;
  --km-primary-text: #ffffff;
  --km-bg: #ffffff;
  --km-text: #1a1a1a;
  --km-border-radius: 12px;
}

keksmeister-trigger {
  --km-trigger-bg: #2563eb;
  --km-trigger-color: #ffffff;
}
```
