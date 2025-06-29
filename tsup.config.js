import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  resolveAlias: {
    '@': './src',
  },
});
