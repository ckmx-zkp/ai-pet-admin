import { mkdir, writeFile } from 'node:fs/promises'

const worker = `// Static SPA entry point for AI Pet Admin.
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || !request.headers.get('accept')?.includes('text/html')) {
      return response
    }
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
  },
}\n`

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/server/index.js', import.meta.url), worker)
