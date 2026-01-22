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

    build: {
      outDir: isGithub ? 'dist' : '../backend/public',
      emptyOutDir: true,
    },
  }
})
