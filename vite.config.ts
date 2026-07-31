import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { sites } from './build/sites-vite-plugin.js'

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false'
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/wrangler.log'
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry'
  const { cloudflare } = await import('@cloudflare/vite-plugin')

  return {
    plugins: [
      vue(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'server' },
        config: {
          main: './worker/index.ts',
          compatibility_date: '2026-05-22',
          assets: {
            binding: 'ASSETS',
            not_found_handling: 'single-page-application',
          },
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8010',
          changeOrigin: true,
        },
      },
    },
  }
})
