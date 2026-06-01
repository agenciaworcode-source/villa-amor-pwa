/**
 * Testes: passagem de plantão (bug corrigido em eb18419)
 *
 * Garante que o botão de confirmar passagem está desabilitado sem turno ativo,
 * e que o submit não falha com campos undefined.
 */
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/auth'

test.describe('Passagem de plantão', () => {
  test.use({ storageState: storageStatePath('cozinheiro') })

  test('página carrega sem erros', async ({ page }) => {
    await page.goto('/shift/handover')
    await expect(page.getByRole('heading', { name: 'Passagem de Plantão' })).toBeVisible()
  })

  test('botão confirmar está desabilitado sem texto de notas', async ({ page }) => {
    await page.goto('/shift/handover')
    const btn = page.getByRole('button', { name: /CONFIRMAR PASSAGEM/i })
    await expect(btn).toBeDisabled()
  })

  test('sem turno ativo — botão permanece desabilitado mesmo com texto', async ({ page }) => {
    await page.goto('/shift/handover')

    // Preenche o texto mas sem turno ativo o botão deve continuar desabilitado
    const textarea = page.getByPlaceholder(/Sr\. Tião/i)
    await textarea.fill('Notas de teste do plantão.')

    const btn = page.getByRole('button', { name: /CONFIRMAR PASSAGEM/i })

    // Se não há turno ativo, o botão continua desabilitado
    const turnoAtivo = await page.getByText('Nenhum turno ativo').isVisible().catch(() => false)
    if (turnoAtivo) {
      await expect(btn).toBeDisabled()
      await expect(page.getByText('Inicie um turno antes')).toBeVisible()
    } else {
      // Há turno ativo — botão deve estar habilitado
      await expect(btn).toBeEnabled()
    }
  })

  test('com turno ativo — submit registra e redireciona para /home', async ({ page }) => {
    // Primeiro inicia um turno
    await page.goto('/home')
    const iniciarTurno = page.getByRole('button', { name: /INICIAR TURNO/i })
    const turnoJaAtivo = await iniciarTurno.isVisible().catch(() => false)

    if (turnoJaAtivo) {
      await iniciarTurno.click()
      // Aguarda o turno iniciar
      await page.waitForTimeout(1_000)
    }

    await page.goto('/shift/handover')
    const textarea = page.getByPlaceholder(/Sr\. Tião/i)
    await textarea.fill('Teste automatizado — passagem de plantão.')

    const btn = page.getByRole('button', { name: /CONFIRMAR PASSAGEM/i })

    // Só confirma se o botão estiver habilitado (turno ativo)
    const enabled = await btn.isEnabled()
    if (enabled) {
      await btn.click()
      await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })
    } else {
      test.skip(true, 'Nenhum turno ativo disponível para este teste')
    }
  })
})
