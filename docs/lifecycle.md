# Lifecycle & Visibility

This page explains **when** and **why** the banner and trigger show or hide, so you don't need to manage their visibility yourself.

## Banner lifecycle

```
Page load
  │
  ├─ Has consent cookie with matching revision?
  │   ├─ YES → _view = 'hidden' (banner not shown)
  │   │        ScriptBlocker activates consented scripts
  │   │        ServiceRegistry syncs adapters
  │   │
  │   └─ NO  → _view = 'banner' (consent bar visible)
  │
User interacts
  │
  ├─ "Accept All" → saves consent → _view = 'hidden'
  ├─ "Reject All" → saves rejection → _view = 'hidden'
  ├─ "Settings"   → _view = 'modal' (full category view)
  │   ├─ "Save"       → saves custom choices → _view = 'hidden'
  │   ├─ "Accept All" → saves consent → _view = 'hidden'
  │   ├─ "Reject All" → saves rejection → _view = 'hidden'
  │   └─ Escape / overlay click → _view = 'banner'
  │
Later (trigger click, programmatic call)
  │
  ├─ trigger.click      → banner.openSettings() → _view = 'modal'
  ├─ banner.show()      → _view = 'banner'
  └─ banner.openSettings() → _view = 'modal'
```

### Important: The banner stays in the DOM

The `<keksmeister-banner>` element is **always** in the DOM. When hidden, its Shadow DOM is empty (no rendered content). It is not removed, not display:none'd — it simply renders nothing. This means:

- `document.querySelector('keksmeister-banner')` always works
- `banner.manager` is always accessible
- `banner.openSettings()` can be called at any time
- Event listeners remain attached

### When does the banner re-appear?

1. **No consent cookie** — First visit or cookie was cleared
2. **Revision mismatch** — Config `revision` changed since last consent
3. **Consent expired** — `consentMaxAgeDays` exceeded
4. **Programmatic** — `banner.show()` or `banner.openSettings()` called

## Trigger lifecycle

The trigger is simpler:

```
Page load → renders button → waits for click
Click → finds <keksmeister-banner> via CSS selector → calls openSettings()
```

The trigger is **always visible** (icon variant is fixed-positioned, text variant is inline). It does not check consent state. It's just a button that opens the settings.

### How does the trigger find the banner?

```
trigger click
  → document.querySelector('keksmeister-banner')  // default
  → or document.querySelector(banner-selector)     // if attribute set
  → calls element.openSettings()
```

There is no Angular service, no React context, no event bus. Just a DOM query. This is why both elements can be placed anywhere in the page — they don't need to be siblings or have a specific parent-child relationship.

## What about SPAs?

In single-page applications (Angular, React, Vue), the banner and trigger should be placed in the **root layout component** — the one that persists across route changes.

```
App
├── Layout (place banner + trigger here)
│   ├── <router-outlet> / <Outlet> / <router-view>
│   ├── <keksmeister-banner>    ← always in DOM
│   └── <keksmeister-trigger>   ← always in DOM
```

The elements survive route changes because they're outside the routed area.

### Do NOT place them in route-specific components

```
// WRONG: Banner gets destroyed on navigation
RoutedPage
├── <keksmeister-banner>  ← destroyed when navigating away
```

## Script blocking lifecycle

```
Banner initializes
  → ScriptBlocker.start()
  → MutationObserver watches for <script data-keksmeister="...">

Consent given for category "analytics"
  → ScriptBlocker finds all <script data-keksmeister="analytics">
  → For each: creates new <script> element, copies attributes
  → data-src becomes src (triggers load)
  → Original element is replaced

Consent revoked
  → Already-loaded scripts cannot be "unloaded"
  → Page needs reload for full effect
  → autoClearCookies removes tracking cookies immediately
```

## Service adapter lifecycle

```
ServiceRegistry created with ConsentManager
  → Listens for 'keksmeister:consent' and 'keksmeister:revoke'

Adapter registered
  → Immediately checks current consent state
  → Calls onConsent() or onRevoke() based on current state

Consent changes
  → All adapters for affected categories are synced
  → onConsent() for newly granted categories
  → onRevoke() for newly revoked categories
```

Adapters are stateless — they call the third-party API every time. Most third-party SDKs (PostHog, Mixpanel, etc.) handle idempotency internally.
