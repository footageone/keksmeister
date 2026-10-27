import { defineConfig } from 'vite';
import { resolve } from 'path';
import { codecovVitePlugin } from '@codecov/vite-plugin';

export default defineConfig({
  plugins: [
    codecovVitePlugin({
      enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
      bundleName: 'keksmeister',
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Keksmeister',
      fileName: 'keksmeister',
      formats: ['es', 'umd'],
    },
    target: 'es2022',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        // The ConsentLogger implementation is dynamically imported (see
        // src/core/lazy-consent-logger.ts) and, for the ES output, lands in
        // its own chunk. UMD can't code-split (Rollup inlines it there
        // automatically instead), so this only affects the ES build. A
        // stable, non-hashed name lets the build script below run terser on
        // it by a fixed path, and keeps the CDN URL predictable.
        chunkFileNames: '[name].js',
      },
    },
  },
});
