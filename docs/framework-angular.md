# Angular Integration

Keksmeister uses standard Web Components. Angular supports them natively — **no wrapper library needed**.

> Examples use Angular 19+ conventions: standalone by default, signal-based queries (`viewChild()`), built-in control flow (`@if`).

## Setup

### 1. Install

```bash
npm install keksmeister
```

### 2. Import once

Import keksmeister in your `main.ts` to register the Custom Elements globally:

```ts
// main.ts
import 'keksmeister';
```

> This single import registers `<keksmeister-banner>` and `<keksmeister-trigger>`.
> Do NOT import it in every component — once is enough.

### 3. Allow Custom Elements

Add `CUSTOM_ELEMENTS_SCHEMA` to the component that uses the elements:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <router-outlet />

    <keksmeister-banner
      privacy-url="/datenschutz"
      lang="de"
    ></keksmeister-banner>

    <keksmeister-trigger position="bottom-left"></keksmeister-trigger>
  `,
})
export class AppComponent {}
```

> Since Angular 19, components are standalone by default — no `standalone: true` needed.

**That's it for basic usage.** The banner and trigger are in the DOM permanently. They manage their own visibility.

## Common mistakes

### Do NOT do this

```ts
// WRONG: Don't conditionally render the banner
@Component({
  template: `
    @if (showBanner) {
      <keksmeister-banner />
    }
  `,
})
```

```ts
// WRONG: Don't create elements programmatically
ngOnInit() {
  const banner = document.createElement('keksmeister-banner');
  document.body.appendChild(banner);
}
```

```ts
// WRONG: Don't manage visibility from Angular
constructor() {
  const banner = viewChild<ElementRef>('banner');
  effect(() => {
    banner()?.nativeElement.style.display = this.consentGiven() ? 'none' : 'block';
  });
}
```

The banner handles all of this internally. Using `@if`, `[hidden]`, or manual DOM manipulation will break its state machine.

### Do this instead

```ts
// CORRECT: Place elements in template, configure if needed
@Component({
  template: `
    <keksmeister-banner #banner />
    <keksmeister-trigger />
  `,
})
```

## Programmatic configuration

For full config with callbacks, use the signal-based `viewChild()`:

```ts
import {
  Component,
  viewChild,
  ElementRef,
  afterNextRender,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import type { KeksmeisterBanner } from 'keksmeister';

@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <keksmeister-banner #banner />
    <keksmeister-trigger />
  `,
})
export class AppComponent {
  private banner = viewChild<ElementRef<KeksmeisterBanner>>('banner');

  constructor() {
    afterNextRender(() => {
      const el = this.banner()?.nativeElement;
      if (!el) return;

      el.config = {
        categories: [
          { id: 'essential', label: 'Notwendig', required: true },
          { id: 'analytics', label: 'Statistiken' },
          { id: 'marketing', label: 'Marketing' },
        ],
        privacyUrl: '/datenschutz',
        lang: 'de',
        onConsent: (record) => {
          console.log('Consent:', record);
        },
      };
    });
  }
}
```

## Listening to events

Use Angular's event binding with the full event name:

```html
<keksmeister-banner
  #banner
  (keksmeister:close)="onConsentClose()"
  (keksmeister:consent)="onConsent($event)"
/>
```

```ts
onConsentClose() {
  console.log('Banner closed');
}

onConsent(event: CustomEvent) {
  console.log('Consent record:', event.detail);
}
```

Alternatively, use `effect()` to react to the banner's consent state:

```ts
import { Component, viewChild, ElementRef, effect, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import type { KeksmeisterBanner } from 'keksmeister';

@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<keksmeister-banner #banner />`,
})
export class AppComponent {
  private banner = viewChild<ElementRef<KeksmeisterBanner>>('banner');

  constructor() {
    effect(() => {
      const el = this.banner()?.nativeElement;
      el?.addEventListener('keksmeister:consent', (e: Event) => {
        console.log('Consent:', (e as CustomEvent).detail);
      });
    });
  }
}
```

## Service adapters

Register adapters in `afterNextRender` — after the banner has initialized:

```ts
import { afterNextRender } from '@angular/core';
import { ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
import { createGoogleAnalyticsAdapter } from 'keksmeister/adapters/google-analytics';

constructor() {
  afterNextRender(() => {
    const manager = this.banner()?.nativeElement.manager;
    if (!manager) return;

    const registry = new ServiceRegistry(manager);
    registry.register(createPostHogAdapter(posthog));
    registry.register(createGoogleAnalyticsAdapter());
  });
}
```

## Trigger on a privacy page

Use the text variant in a specific component template:

```ts
@Component({
  selector: 'app-privacy-page',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <h1>Datenschutz</h1>
    <p>...</p>

    <h2>Cookie-Einstellungen anpassen</h2>
    <keksmeister-trigger variant="text" />
  `,
})
export class PrivacyPageComponent {}
```

The trigger finds the `<keksmeister-banner>` from the root layout automatically.

## Script blocking in `index.html`

Blocked scripts go in `index.html`, not in Angular templates:

```html
<!-- index.html -->
<script type="text/plain" data-keksmeister="analytics"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX">
</script>

<script type="text/plain" data-keksmeister="analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXX');
</script>
```
