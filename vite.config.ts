import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
        assetFileNames: 'keksmeister.[ext]',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    },
  },
});
