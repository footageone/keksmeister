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
