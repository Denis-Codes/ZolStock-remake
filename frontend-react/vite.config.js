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
  }
})
