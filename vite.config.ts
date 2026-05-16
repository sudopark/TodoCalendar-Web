/// <reference types="vitest/config" />
import path from 'path'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const commitSha =
  process.env.GITHUB_SHA?.substring(0, 7) ||
  (() => {
    try {
      return execSync('git rev-parse --short=7 HEAD').toString().trim()
    } catch {
      return 'dev'
    }
  })()
const buildTime = new Date().toISOString()
const deployEnv = process.env.VITE_DEPLOY_ENV ?? 'local'
const appVersion =
  process.env.VITE_APP_VERSION
  ?? (deployEnv === 'production' ? pkg.version : `${pkg.version}+${commitSha}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'emit-version-json',
      apply: 'build',
      writeBundle(options) {
        const dir = options.dir ?? 'dist'
        writeFileSync(
          path.join(dir, 'version.json'),
          JSON.stringify(
            { version: appVersion, commit: commitSha, buildTime, deployEnv },
            null,
            2,
          ) + '\n',
        )
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(commitSha),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __DEPLOY_ENV__: JSON.stringify(deployEnv),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:5001/todocalendar-1707723626269/us-central1/api',
      '/v2': 'http://localhost:5001/todocalendar-1707723626269/us-central1/api',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    env: {
      TZ: 'Asia/Seoul',
    },
  },
})
