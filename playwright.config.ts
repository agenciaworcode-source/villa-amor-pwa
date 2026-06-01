import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Carrega .env.test para credenciais de teste
dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,        // testes compartilham dados no Supabase — rodar em série
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Simula iPhone 14 — o sistema é mobile-first
    ...devices['iPhone 14'],
  },

  // Inicia o servidor Next.js antes dos testes (em CI ou quando não está rodando)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },

  // Autentica os usuários de teste uma única vez antes de todos os specs
  globalSetup: './tests/global-setup.ts',

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 14'] },
    },
  ],
})
