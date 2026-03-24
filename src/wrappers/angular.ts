/**
 * Angular integration guide for Keksmeister.
 *
 * Since Keksmeister uses standard Web Components, Angular supports them
 * natively with CUSTOM_ELEMENTS_SCHEMA. No wrapper library needed.
 *
 * ## Setup
 *
 * 1. Import keksmeister in your main.ts or app.component.ts:
 *
 *    ```ts
 *    import 'keksmeister';
 *    ```
 *
 * 2. Add CUSTOM_ELEMENTS_SCHEMA to your component or module:
 *
 *    ```ts
 *    import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
 *
 *    @Component({
 *      selector: 'app-root',
 *      standalone: true,
 *      schemas: [CUSTOM_ELEMENTS_SCHEMA],
 *      template: `
 *        <keksmeister-banner
 *          privacy-url="/datenschutz"
 *          lang="de"
 *        ></keksmeister-banner>
 *        <keksmeister-trigger position="bottom-left"></keksmeister-trigger>
 *      `,
 *    })
 *    export class AppComponent {}
 *    ```
 *
 * 3. For programmatic config, use ViewChild:
 *
 *    ```ts
 *    import { Component, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
 *    import type { KeksmeisterBanner as BannerElement } from 'keksmeister';
 *
 *    @Component({
 *      selector: 'app-root',
 *      standalone: true,
 *      schemas: [CUSTOM_ELEMENTS_SCHEMA],
 *      template: `<keksmeister-banner #banner></keksmeister-banner>`,
 *    })
 *    export class AppComponent implements AfterViewInit {
 *      @ViewChild('banner') bannerRef!: ElementRef<BannerElement>;
 *
 *      ngAfterViewInit() {
 *        this.bannerRef.nativeElement.config = {
 *          categories: [
 *            { id: 'essential', label: 'Essential', required: true },
 *            { id: 'analytics', label: 'Analytics' },
 *          ],
 *          privacyUrl: '/datenschutz',
 *          lang: 'de',
 *          onConsent: (record) => {
 *            console.log('Consent:', record);
 *          },
 *        };
 *      }
 *    }
 *    ```
 *
 * 4. Listen to events:
 *
 *    ```html
 *    <keksmeister-banner
 *      #banner
 *      (keksmeister:close)="onConsentClose()"
 *    ></keksmeister-banner>
 *    ```
 *
 * 5. For ServiceRegistry integration:
 *
 *    ```ts
 *    import { ServiceRegistry } from 'keksmeister';
 *    import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
 *
 *    ngAfterViewInit() {
 *      const banner = this.bannerRef.nativeElement;
 *      const registry = new ServiceRegistry(banner.manager!);
 *      registry.register(createPostHogAdapter(posthog));
 *    }
 *    ```
 */

// This file serves as documentation. Angular does not need a wrapper —
// Web Components are natively supported with CUSTOM_ELEMENTS_SCHEMA.
export {};
