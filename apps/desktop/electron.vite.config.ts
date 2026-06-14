import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
      outDir: 'out/main',
    },
    resolve: {
      alias: {
        '@open-flow/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
      outDir: 'out/preload',
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
      outDir: 'out/renderer',
    },
    resolve: {
      alias: {
        '@open-flow/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
});
