mport { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // process.cwd() requires @types/node which we just added.
  const env = loadEnv(mode, (process as any).cwd(), '')

  return {
    plugins: [react()],
    define: {
      // This allows 'process.env.API_KEY' to work in client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '') 
    }
  }
})
