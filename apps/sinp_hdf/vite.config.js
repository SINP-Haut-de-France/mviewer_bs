import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Identifier si nous générons pour "main" ou "reactComponentManager"
  const target = process.env.BUILD_TARGET || 'main';
  const isMain = target === 'main';

  return {
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      sourcemap: true,
      emptyOutDir: isMain, // Nettoie uniquement pour une des build
      outDir: './addons/reactInjector/dist/',
      rollupOptions: {
        input: isMain
          ? resolve(__dirname, './react-components/main.jsx') // Point d'entrée unique
          : resolve(__dirname, './react-components/reactComponentManager.jsx'),
        output: {
          format: 'umd', // Format compatible avec des scripts legacy (UMD monolithique)
          entryFileNames: isMain ? 'main.js' : 'reactComponentManager.js', // Générez deux fichiers différents
          name: isMain ? 'MainModule' : 'ReactComponentManager', // Nom du module exporté
        },
      },
    },
    resolve: {
      alias: {
        '@react': resolve(__dirname, './react-components'),
      },
    },
  };
});
