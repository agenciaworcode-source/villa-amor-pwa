/**
 * Testes: validação de role na página de execução (bug corrigido em 45eda73)
 *
 * Garante que um colaborador não consegue executar POPs de outro setor,
 * mesmo acessando a URL diretamente.
 */
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/auth'

// ID do POP de limpeza no banco de teste — configure em .env.test
const LIMPEZA_POP_ID = process.env.TEST_LIMPEZA_POP_ID ?? ''
const COZINHA_POP_ID = process.env.TEST_COZINHA_POP_ID ?? ''

test.describe('Execução — validação de role', () => {
  test.use({ storageState: storageStatePath('cozinheiro') })

  test('cozinheiro redirecionado ao tentar executar POP de limpeza via URL', async ({ page }) => {
    test.skip(!LIMPEZA_POP_ID, 'TEST_LIMPEZA_POP_ID não configurado em .env.test')

    await page.goto(`/execution/new?popId=${LIMPEZA_POP_ID}`)

    // Deve redirecionar para /home
    await expect(page).toHaveURL(/\/home/, { timeout: 8_000 })
  })

  test('cozinheiro consegue acessar a execução do seu próprio POP', async ({ page }) => {
    test.skip(!COZINHA_POP_ID, 'TEST_COZINHA_POP_ID não configurado em .env.test')

    await page.goto(`/execution/new?popId=${COZINHA_POP_ID}`)

    // Não deve redirecionar — deve permanecer na página de execução
    await expect(page).not.toHaveURL(/\/home/, { timeout: 8_000 })
    await expect(page.getByText('Carregando protocolo...')).not.toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Execução — acesso sem autenticação', () => {
  // Sem storageState = usuário não autenticado
  test('usuário não autenticado é redirecionado para /login', async ({ page }) => {
    test.skip(!LIMPEZA_POP_ID, 'TEST_LIMPEZA_POP_ID não configurado em .env.test')

    await page.goto(`/execution/new?popId=${LIMPEZA_POP_ID}`)
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })
})
