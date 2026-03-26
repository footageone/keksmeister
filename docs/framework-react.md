# React Integration

Keksmeister provides a thin React wrapper that bridges Web Component patterns (config-as-object, custom events) to idiomatic React props.

## Setup

### 1. Install

```bash
npm install keksmeister
```

### 2. Use the React wrapper

```tsx
import { KeksmeisterBanner, KeksmeisterTrigger } from 'keksmeister/react';

function App() {
  return (
    <>
      <KeksmeisterBanner
        config={{
          categories: [
            { id: 'essential', label: 'Essential', required: true },
            { id: 'analytics', label: 'Analytics' },
            { id: 'marketing', label: 'Marketing' },
          ],
          privacyUrl: '/privacy',
          lang: 'en',
          onConsent: (record) => {
            console.log('Consent:', record);
          },
        }}
        onClose={() => console.log('Banner closed')}
      />
      <KeksmeisterTrigger position="bottom-left" />
    </>
  );
}
```

**That's it.** The banner and trigger manage their own visibility.

## Common mistakes

### Do NOT do this

```tsx
// WRONG: Don't conditionally render
function App() {
  const [show, setShow] = useState(true);
  return show ? <KeksmeisterBanner /> : null;
}
```

```tsx
// WRONG: Don't manage visibility with state
function App() {
  const [visible, setVisible] = useState(true);
  return <div style={{ display: visible ? 'block' : 'none' }}>
    <KeksmeisterBanner />
  </div>;
}
```

```tsx
// WRONG: Don't create/remove the element based on consent state
useEffect(() => {
  if (hasConsent) {
    bannerRef.current?.remove();
  }
}, [hasConsent]);
```

The banner handles all show/hide logic internally. Conditional rendering destroys its state machine and breaks script blocking.

### Do this instead

```tsx
// CORRECT: Render once, let it manage itself
function App() {
  return (
    <>
      <Outlet />
      <KeksmeisterBanner config={config} />
      <KeksmeisterTrigger />
    </>
  );
}
```

## Simple setup (without wrapper)

If you prefer using the Web Components directly:

```tsx
import 'keksmeister';

function App() {
  return (
    <>
      {/* @ts-expect-error Web Component */}
      <keksmeister-banner
        privacy-url="/privacy"
        lang="en"
      />
      {/* @ts-expect-error Web Component */}
      <keksmeister-trigger position="bottom-left" />
    </>
  );
}
```

For programmatic config without the wrapper, use a ref:

```tsx
import 'keksmeister';
import { useRef, useEffect } from 'react';
import type { KeksmeisterBanner } from 'keksmeister';

function App() {
  const ref = useRef<KeksmeisterBanner>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.config = {
        categories: [
          { id: 'essential', label: 'Essential', required: true },
          { id: 'analytics', label: 'Analytics' },
        ],
        privacyUrl: '/privacy',
        lang: 'en',
      };
    }
  }, []);

  return (
    <>
      {/* @ts-expect-error Web Component */}
      <keksmeister-banner ref={ref} />
      {/* @ts-expect-error Web Component */}
      <keksmeister-trigger />
    </>
  );
}
```

## Service adapters

```tsx
import { useRef, useEffect } from 'react';
import { KeksmeisterBanner } from 'keksmeister/react';
import { ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';

function App() {
  const registryRef = useRef<ServiceRegistry | null>(null);

  return (
    <KeksmeisterBanner
      config={{
        categories: [
          { id: 'essential', label: 'Essential', required: true },
          { id: 'analytics', label: 'Analytics' },
        ],
        privacyUrl: '/privacy',
        lang: 'en',
      }}
      onClose={() => {
        // Access manager from the banner element
        const banner = document.querySelector('keksmeister-banner') as any;
        if (banner?.manager && !registryRef.current) {
          registryRef.current = new ServiceRegistry(banner.manager);
          registryRef.current.register(createPostHogAdapter(posthog));
        }
      }}
    />
  );
}
```

## Next.js

In Next.js, import keksmeister only on the client side:

```tsx
'use client';

import dynamic from 'next/dynamic';

const CookieConsent = dynamic(
  () => import('keksmeister/react').then((mod) => ({
    default: () => (
      <>
        <mod.KeksmeisterBanner
          config={{
            categories: [
              { id: 'essential', label: 'Essential', required: true },
              { id: 'analytics', label: 'Analytics' },
            ],
            privacyUrl: '/privacy',
            lang: 'en',
          }}
        />
        <mod.KeksmeisterTrigger position="bottom-left" />
      </>
    ),
  })),
  { ssr: false }
);

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

## Trigger on a privacy page

```tsx
import { KeksmeisterTrigger } from 'keksmeister/react';

function PrivacyPage() {
  return (
    <main>
      <h1>Privacy Policy</h1>
      <p>...</p>

      <h2>Manage Cookie Settings</h2>
      <KeksmeisterTrigger variant="text" />
    </main>
  );
}
```
