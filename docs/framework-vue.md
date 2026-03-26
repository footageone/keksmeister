# Vue 3 Integration

Keksmeister uses standard Web Components. Vue 3 supports them natively — **no wrapper library needed**.

## Setup

### 1. Install

```bash
npm install keksmeister
```

### 2. Configure Vue to recognize Custom Elements

In `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('keksmeister-'),
        },
      },
    }),
  ],
});
```

### 3. Import once

In your `main.ts`:

```ts
import { createApp } from 'vue';
import App from './App.vue';
import 'keksmeister';

createApp(App).mount('#app');
```

### 4. Use in templates

```vue
<!-- App.vue -->
<template>
  <router-view />

  <keksmeister-banner
    privacy-url="/datenschutz"
    lang="de"
  ></keksmeister-banner>

  <keksmeister-trigger position="bottom-left"></keksmeister-trigger>
</template>
```

**That's it.** The banner and trigger are in the DOM permanently. They manage their own visibility.

## Common mistakes

### Do NOT do this

```vue
<!-- WRONG: Don't conditionally render -->
<template>
  <keksmeister-banner v-if="showBanner" />
</template>
```

```vue
<!-- WRONG: Don't manage visibility with v-show -->
<template>
  <keksmeister-banner v-show="!consentGiven" />
</template>
```

```ts
// WRONG: Don't create elements programmatically
onMounted(() => {
  const banner = document.createElement('keksmeister-banner');
  document.body.appendChild(banner);
});
```

The banner handles all show/hide logic internally. Using `v-if`, `v-show`, or manual DOM manipulation will break its state machine and consent flow.

### Do this instead

```vue
<!-- CORRECT: Place once in your root layout -->
<template>
  <router-view />
  <keksmeister-banner privacy-url="/datenschutz" lang="de" />
  <keksmeister-trigger />
</template>
```

## Programmatic configuration

For full config with callbacks, use template refs:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { KeksmeisterBanner } from 'keksmeister';

const banner = ref<KeksmeisterBanner>();

onMounted(() => {
  if (banner.value) {
    banner.value.config = {
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
});
</script>

<template>
  <keksmeister-banner ref="banner" />
  <keksmeister-trigger />
</template>
```

## Listening to events

```vue
<template>
  <keksmeister-banner
    ref="banner"
    @keksmeister:close="onClose"
    @keksmeister:consent="onConsent"
  />
</template>

<script setup lang="ts">
function onClose() {
  console.log('Banner closed');
}

function onConsent(event: CustomEvent) {
  console.log('Consent record:', event.detail);
}
</script>
```

## Service adapters

Register adapters in `onMounted` — after the banner has initialized:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { KeksmeisterBanner } from 'keksmeister';
import { ServiceRegistry } from 'keksmeister';
import { createPostHogAdapter } from 'keksmeister/adapters/posthog';

const banner = ref<KeksmeisterBanner>();

onMounted(() => {
  if (banner.value?.manager) {
    const registry = new ServiceRegistry(banner.value.manager);
    registry.register(createPostHogAdapter(posthog));
  }
});
</script>

<template>
  <keksmeister-banner ref="banner" />
  <keksmeister-trigger />
</template>
```

## Trigger on a privacy page

```vue
<!-- PrivacyPage.vue -->
<template>
  <main>
    <h1>Datenschutz</h1>
    <p>...</p>

    <h2>Cookie-Einstellungen anpassen</h2>
    <keksmeister-trigger variant="text"></keksmeister-trigger>
  </main>
</template>
```

The trigger finds the `<keksmeister-banner>` from the root layout automatically.

## Nuxt 3

In Nuxt, create a client-only plugin:

```ts
// plugins/keksmeister.client.ts
import 'keksmeister';

export default defineNuxtPlugin(() => {
  // Custom Elements are now registered
});
```

Configure the Vue compiler in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('keksmeister-'),
    },
  },
});
```

Then use in your `app.vue`:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <ClientOnly>
    <keksmeister-banner privacy-url="/datenschutz" lang="de" />
    <keksmeister-trigger position="bottom-left" />
  </ClientOnly>
</template>
```
