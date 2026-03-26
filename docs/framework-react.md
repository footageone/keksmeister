# React Integration

Keksmeister provides a thin React wrapper that bridges Web Component patterns (config-as-object, custom events) to idiomatic React props.

> Examples use React 19+ conventions: `ref` as prop (no `forwardRef`), ref callback cleanup functions.

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

For programmatic config without the wrapper, use a ref callback (React 19+):

```tsx
import 'keksmeister';
import type { KeksmeisterBanner } from 'keksmeister';
import type { KeksmeisterConfig } from 'keksmeister';

const config: KeksmeisterConfig = {
  categories: [
    { id: 'essential', label: 'Essential', required: true },
    { id: 'analytics', label: 'Analytics' },
  ],
  privacyUrl: '/privacy',
  lang: 'en',
};

function App() {
  return (
    <>
      {/* @ts-expect-error Web Component */}
      <keksmeister-banner ref={(el: KeksmeisterBanner | null) => {
        if (el) el.config = config;
      }} />
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

## Next.js (App Router)

In Next.js 15+ with the App Router, wrap the consent components in a Client Component boundary:

```tsx
// components/cookie-consent.tsx
'use client';

import { KeksmeisterBanner, KeksmeisterTrigger } from 'keksmeister/react';
import type { KeksmeisterConfig } from 'keksmeister';

const config: KeksmeisterConfig = {
  categories: [
    { id: 'essential', label: 'Essential', required: true },
    { id: 'analytics', label: 'Analytics' },
  ],
  privacyUrl: '/privacy',
  lang: 'en',
};

export function CookieConsent() {
  return (
    <>
      <KeksmeisterBanner config={config} />
      <KeksmeisterTrigger position="bottom-left" />
    </>
  );
}
```

```tsx
// app/layout.tsx (Server Component — no 'use client' needed)
import { CookieConsent } from '@/components/cookie-consent';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

> The layout itself stays a Server Component. Only the `CookieConsent` wrapper is a Client Component. This is the recommended Next.js pattern — keep client boundaries as small as possible.

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
