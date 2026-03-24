/**
 * Vue integration guide for Keksmeister.
 *
 * Since Keksmeister uses standard Web Components, Vue 3 supports them
 * natively. No wrapper library needed.
 *
 * ## Setup
 *
 * 1. Configure Vue to recognize keksmeister elements in vite.config.ts:
 *
 *    ```ts
 *    import { defineConfig } from 'vite';
 *    import vue from '@vitejs/plugin-vue';
 *
 *    export default defineConfig({
 *      plugins: [
 *        vue({
 *          template: {
 *            compilerOptions: {
 *              isCustomElement: (tag) => tag.startsWith('keksmeister-'),
 *            },
 *          },
 *        }),
 *      ],
 *    });
 *    ```
 *
 * 2. Import keksmeister in your main.ts:
 *
 *    ```ts
 *    import 'keksmeister';
 *    ```
 *
 * 3. Use in templates:
 *
 *    ```vue
 *    <template>
 *      <keksmeister-banner
 *        privacy-url="/datenschutz"
 *        lang="de"
 *        ref="banner"
 *      ></keksmeister-banner>
 *      <keksmeister-trigger position="bottom-left"></keksmeister-trigger>
 *    </template>
 *    ```
 *
 * 4. For programmatic config, use template refs:
 *
 *    ```vue
 *    <script setup lang="ts">
 *    import { ref, onMounted } from 'vue';
 *    import type { KeksmeisterBanner } from 'keksmeister';
 *
 *    const banner = ref<KeksmeisterBanner>();
 *
 *    onMounted(() => {
 *      if (banner.value) {
 *        banner.value.config = {
 *          categories: [
 *            { id: 'essential', label: 'Essential', required: true },
 *            { id: 'analytics', label: 'Analytics' },
 *          ],
 *          privacyUrl: '/datenschutz',
 *          lang: 'de',
 *          onConsent: (record) => console.log('Consent:', record),
 *        };
 *      }
 *    });
 *    </script>
 *
 *    <template>
 *      <keksmeister-banner ref="banner" />
 *    </template>
 *    ```
 *
 * 5. Listen to events with @ syntax:
 *
 *    ```vue
 *    <keksmeister-banner
 *      @keksmeister:close="onClose"
 *    />
 *    ```
 *
 * 6. For ServiceRegistry:
 *
 *    ```ts
 *    import { ServiceRegistry } from 'keksmeister';
 *    import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
 *
 *    onMounted(() => {
 *      const registry = new ServiceRegistry(banner.value!.manager!);
 *      registry.register(createPostHogAdapter(posthog));
 *    });
 *    ```
 */

// This file serves as documentation. Vue 3 does not need a wrapper —
// Web Components are natively supported with isCustomElement config.
export {};
