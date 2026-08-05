// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react-swc'

// // https://vitejs.dev/config/
// export default defineConfig({
// 	plugins: [react()],
// 	build: {
// 		outDir: '../backend/public',
// 		emptyOutDir: true,
// 	},
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const isGithub = mode === 'github'

  return {
    plugins: [react()],

    base: isGithub ? '/ZolStock-remake/' : '/',

    // Fail loudly if 5173 is taken instead of silently walking up to the next
    // free port — a stale dev server should be an error, not a new port number.
    server: {
      port: 5173,
      strictPort: true,
    },

    build: {
      outDir: isGithub ? 'dist' : '../backend/public',
      emptyOutDir: true,
    },

    test: {
      // A fake DOM in Node. Component tests need document/window, but a real
      // browser costs seconds per test — jsdom costs milliseconds. Anything
      // that genuinely needs a browser engine (layout, real paint, cross-
      // browser behaviour) belongs in Playwright, not here.
      environment: 'jsdom',

      // describe/it/expect without importing them in every file, matching how
      // the Playwright specs already read.
      globals: true,

      setupFiles: ['./tests/unit/setup.js'],

      // Deliberately narrow. tests/e2e and tests/pages belong to Playwright,
      // and both runners collecting the same files would have each trying to
      // run the other's suite.
      include: ['tests/unit/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],

      css: false,

      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'html', 'lcov'],
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/**/*.test.{js,jsx}', 'src/scripts/**', 'src/data/**'],
      },
    },
  }
})
