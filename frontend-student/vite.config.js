import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function getBuildAssetUrls(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolutePath = resolve(directory, entry.name)
    if (entry.isDirectory()) return getBuildAssetUrls(absolutePath, relativePath)
    if (relativePath.endsWith('.map')) return []
    return [`/${relativePath}`]
  })
}

function injectServiceWorkerPrecache() {
  return {
    name: 'inject-service-worker-precache',
    closeBundle() {
      const distDirectory = resolve(process.cwd(), 'dist')
      const serviceWorkerPath = resolve(distDirectory, 'sw.js')
      const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
      const assetUrls = getBuildAssetUrls(resolve(distDirectory, 'assets'), 'assets');
      const precacheUrls = ['/index.html', ...assetUrls];
      const updatedServiceWorker = serviceWorker.replace(
        'const PRECACHE_URLS = [];',
        `const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};`
      )
      writeFileSync(serviceWorkerPath, updatedServiceWorker)
    },
  }
}

export default defineConfig({
  plugins: [react(), injectServiceWorkerPrecache()],
  preview: {
    allowedHosts: true,
  },
})
