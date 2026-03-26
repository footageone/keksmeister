# Angular Integration

Keksmeister uses standard Web Components. Angular supports them natively — **no wrapper library needed**.

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
  standalone: true,
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

**That's it for basic usage.** The banner and trigger are in the DOM permanently. They manage their own visibility.

## Common mistakes

### Do NOT do this

```ts
// WRONG: Don't conditionally render the banner
@Component({
  template: `
    <keksmeister-banner *ngIf="showBanner"></keksmeister-banner>
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
ngAfterViewInit() {
  this.banner.nativeElement.style.display = consentGiven ? 'none' : 'block';
}
```

The banner handles all of this internally. Using `*ngIf`, `[hidden]`, or manual DOM manipulation will break its state machine.

### Do this instead

```ts
// CORRECT: Place elements in template, configure if needed
@Component({
  template: `
    <keksmeister-banner #banner></keksmeister-banner>
    <keksmeister-trigger></keksmeister-trigger>
  `,
})
```

## Programmatic configuration

For full config with callbacks, use `ViewChild`:

```ts
import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import type { KeksmeisterBanner } from 'keksmeister';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <keksmeister-banner #banner></keksmeister-banner>
    <keksmeister-trigger></keksmeister-trigger>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild('banner') bannerRef!: ElementRef<KeksmeisterBanner>;

  ngAfterViewInit() {
    this.bannerRef.nativeElement.config = {
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
></keksmeister-banner>
```

```ts
onConsentClose() {
  console.log('Banner closed');
}

onConsent(event: CustomEvent) {
  console.log('Consent record:', event.detail);
}
```

## Service adapters

Register adapters in `ngAfterViewInit` — after the banner has initialized:

```ts
import { ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
import { createGoogleAnalyticsAdapter } from 'keksmeister/adapters/google-analytics';

ngAfterViewInit() {
  const banner = this.bannerRef.nativeElement;
  const registry = new ServiceRegistry(banner.manager!);

  registry.register(createPostHogAdapter(posthog));
  registry.register(createGoogleAnalyticsAdapter());
}
```

## Trigger on a privacy page

Use the text variant in a specific component template:

```ts
@Component({
  selector: 'app-privacy-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <h1>Datenschutz</h1>
    <p>...</p>

    <h2>Cookie-Einstellungen anpassen</h2>
    <keksmeister-trigger variant="text"></keksmeister-trigger>
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
