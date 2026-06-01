import { chromium, FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '..', 'playwright', '.auth')

const ROLES = [
  {
    role: 'cozinheiro',
    email: process.env.TEST_COZINHEIRO_EMAIL!,
    password: process.env.TEST_COZINHEIRO_PASSWORD!,
  },
  {
    role: 'limpeza',
    email: process.env.TEST_LIMPEZA_EMAIL!,
    password: process.env.TEST_LIMPEZA_PASSWORD!,
  },
  {
    role: 'admin',
    email: process.env.TEST_ADMIN_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD!,
  },
]

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000'

  // Garante que a pasta existe
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const browser = await chromium.launch()

  for (const { role, email, password } of ROLES) {
    if (!email || !password) {
      console.warn(`[global-setup] Credenciais de "${role}" não encontradas em .env.test — pulando.`)
      continue
    }

    const page = await browser.newPage()
    try {
      await page.goto(`${baseURL}/login`)

      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')

      // Aguarda redirecionamento pós-login
      await page.waitForURL(/\/(home|dashboard)/, { timeout: 15_000 })

      // Salva cookies + localStorage para reutilização nos testes
      await page.context().storageState({
        path: path.join(AUTH_DIR, `${role}.json`),
      })

      console.log(`[global-setup] "${role}" autenticado.`)
    } catch (err) {
      console.error(`[global-setup] Falha ao autenticar "${role}":`, err)
    } finally {
      await page.close()
    }
  }

  await browser.close()
}
