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
  },
});
