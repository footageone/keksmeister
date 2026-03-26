# Vanilla HTML/JS Integration

The simplest way to use Keksmeister — no framework, no build step needed.

## Via CDN (no build step)

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>My Website</title>

  <!-- Load Keksmeister -->
  <script type="module">
    import 'https://unpkg.com/keksmeister';
  </script>
</head>
<body>

  <h1>Meine Website</h1>
  <p>Inhalt...</p>

  <!-- Blocked until analytics consent -->
  <script type="text/plain" data-keksmeister="analytics"
          data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX">
  </script>

  <!-- Banner + Trigger — place once, they manage themselves -->
  <keksmeister-banner
    privacy-url="/datenschutz"
    lang="de"
  ></keksmeister-banner>

  <keksmeister-trigger position="bottom-left"></keksmeister-trigger>

</body>
</html>
```

## Via npm

```bash
npm install keksmeister
```

```html
<script type="module">
  import 'keksmeister';
</script>

<keksmeister-banner privacy-url="/datenschutz" lang="de"></keksmeister-banner>
<keksmeister-trigger></keksmeister-trigger>
```

## Full example with adapters

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>My Website</title>
</head>
<body>

  <h1>Meine Website</h1>

  <!-- Scripts blocked until consent -->
  <script type="text/plain" data-keksmeister="analytics"
          data-src="https://static.hotjar.com/c/hotjar-XXXXX.js?sv=6">
  </script>

  <!-- Banner and trigger — place once -->
  <keksmeister-banner privacy-url="/datenschutz" lang="de"></keksmeister-banner>
  <keksmeister-trigger position="bottom-left"></keksmeister-trigger>

  <!-- Footer with text trigger -->
  <footer>
    <p><a href="/datenschutz">Datenschutz</a></p>
    <keksmeister-trigger variant="text"></keksmeister-trigger>
  </footer>

  <script type="module">
    import {
      ServiceRegistry,
    } from 'keksmeister';
    import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
    import { createGoogleAnalyticsAdapter } from 'keksmeister/adapters/google-analytics';

    // Wait for the banner to initialize
    const banner = document.querySelector('keksmeister-banner');

    // Register service adapters
    const registry = new ServiceRegistry(banner.manager);
    registry.register(createPostHogAdapter(posthog));
    registry.register(createGoogleAnalyticsAdapter());

    // Listen for consent events
    banner.addEventListener('keksmeister:consent', (e) => {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e.detail),
      });
    });
  </script>

</body>
</html>
```

## Programmatic configuration

```html
<keksmeister-banner id="consent"></keksmeister-banner>

<script type="module">
  import 'keksmeister';

  document.getElementById('consent').config = {
    categories: [
      { id: 'essential', label: 'Notwendig', required: true },
      { id: 'analytics', label: 'Statistiken' },
      { id: 'marketing', label: 'Marketing', services: [
        { name: 'Google Ads', cookies: ['_gcl_au', '_gac_*'] },
      ]},
    ],
    privacyUrl: '/datenschutz',
    lang: 'de',
    autoClearCookies: true,
    googleConsentMode: true,
    onConsent: (record) => {
      console.log('Consent given:', record);
    },
  };
</script>
```

## WordPress / static site generators

For CMS-based sites, add the elements to your theme's footer template:

```html
<!-- In your theme footer (footer.php, _includes/footer.html, etc.) -->
<keksmeister-banner
  privacy-url="/datenschutz"
  lang="de"
  categories='["analytics", "marketing"]'
></keksmeister-banner>

<keksmeister-trigger position="bottom-left"></keksmeister-trigger>

<script type="module">
  import 'https://unpkg.com/keksmeister';
</script>
```

No build step needed. The banner appears on every page and persists consent via cookies.
